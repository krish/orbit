import {getAccessToken, getRefreshToken} from '@functions/sign-in-subscriptions/token.service';
import {TokenVerifyResult} from '@libs/cognito-token-manager';
import {accessTokenValidityHours, TOKEN_TYPE, verify} from '@libs/orbit-token-manager';
import middy from '@middy/core';
import ssm from '@middy/ssm';
import middyJsonBodyParser from '@middy/http-json-body-parser';

import {serverErrorResponse, successResponse, unauthorizedResponse} from '@libs/responses';
import {TokenResponse} from './authz';
import Redis from 'ioredis';
import {getRedisConnection} from '@libs/cache-manager';
import {logger} from '@libs/logger-service';

const tokenFromRefresh = async (event, context) => {
  logger.info('token renew initiated');
  process.env.postgresdb_hostname = context.hostname;
  process.env.postgresdb_password = context.password;

  const refreshToken = event.body.refreshToken || '';
  if (!refreshToken) {
    logger.error('request came without refresh token in payload');
    return unauthorizedResponse({
      error: 'Missing refresh Token',
    });
  }
  const username: string = event.requestContext.authorizer.username;
  const clientId: string = event.requestContext.authorizer.clientId;
  const isValidToken: boolean = event.requestContext.authorizer.isValidToken;

  const verifyResults: TokenVerifyResult = await verify(refreshToken, 'refresh').catch((e) => {
    logger.error(e, 'error on refresh token validation');
    return null;
  });
  if (!verifyResults)
    return serverErrorResponse({
      error: 'Refresh token validation failed, check log for more details',
    });
  if (username !== verifyResults.username || clientId !== verifyResults.clientId || !isValidToken) {
    logger.error(
      {
        apiGatewayUsername: username,
        tokenUsername: verifyResults.username,
        apiGatewayClientId: clientId,
        tokenClientId: verifyResults.clientId,
      },
      'Token consistancy failed.',
    );
    return unauthorizedResponse({
      error: 'Token information consistency failed',
    });
  }

  if (verifyResults.isValid) {
    logger.info('provided refresh token is validated and it is valid');
    //generate new access tokens
    const accessToken = await getAccessToken(verifyResults.username, verifyResults.clientId).catch((e) => {
      logger.error('Error on creating accesstoken for given refresh token', e);
      return null;
    });
    if (!accessToken)
      return serverErrorResponse({
        error: 'Error on creating new accesstoken. please refer logs',
      });

    const refreshToken = await getRefreshToken(verifyResults.username, verifyResults.clientId).catch((e) => {
      logger.error('Error on creating refreshToken', e);
      return null;
    });
    if (!refreshToken)
      return serverErrorResponse({
        error: 'Error on creating new refreshToken. please refer logs',
      });
    /* This is a function that will cache the access token for 1 hour. */
    const redis: Redis = await getRedisConnection().catch((e) => {
      logger.error(e);
      return null;
    });

    const cached_a = await redis.set(
      `codelabs:orbit:user:${verifyResults.username}:token:${TOKEN_TYPE.ACCESS_TOKEN}:${clientId}`,
      JSON.stringify(accessToken),
      'EX',
      accessTokenValidityHours * 3600,
    );
    logger.info('access token cached', cached_a);
    //this cached for serve on request along with accessToken. but cached payload will not be used on anywhere
    const cached_r = await redis.set(
      `codelabs:orbit:user:${verifyResults.username}:token:${TOKEN_TYPE.REFRESH_TOKEN}:${clientId}`,
      JSON.stringify(refreshToken),
      'EX',
      accessTokenValidityHours * 3600,
    );
    logger.info('refresh token cached', cached_r);
    const tokenResponse: TokenResponse = {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
    return successResponse({
      session: tokenResponse,
    });
  } else {
    return unauthorizedResponse({
      error: 'refresh token is expired or invalid',
    });
  }
};

export const main = middy(tokenFromRefresh)
  .use(middyJsonBodyParser())
  .use(
    ssm({
      fetchData: {
        hostname: `/codelabs/${process.env.STAGE}/auth-service/database/pg/hostname`,
        password: `/codelabs/${process.env.STAGE}/auth-service/database/pg/password`,
      },
      setToContext: true,
      cacheExpiry: 60 * 60 * 1000, //though it set to 60 max time would be container time
      cacheKey: 'codelabs-ssm-authservice',
    }),
  );
