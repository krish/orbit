import {TOKEN_TYPE} from '@libs/orbit-token-manager';
import middy from '@middy/core';
import ssm from '@middy/ssm';
import middyJsonBodyParser from '@middy/http-json-body-parser';
import {acceptedResponse, successResponse} from '@libs/responses';
import Redis from 'ioredis';
import {getRedisConnection} from '@libs/cache-manager';
import {logger} from '@libs/logger-service';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

const authToken = async (event, context) => {
  process.env.postgresdb_hostname = context.hostname;
  process.env.postgresdb_password = context.password;

  logger.trace(`postgress hostname and password set to context`);
  const redis: Redis = await getRedisConnection().catch((e) => {
    logger.error(e);
    return null;
  });
  logger.trace(`Redis connection status ${redis ? true : false}`);
  const username = event.requestContext.authorizer.username;
  const clientId = event.requestContext.authorizer.clientId;

  logger.debug(`Request user ${username} clientId ${clientId}`);

  let accessToken: string = await redis.get(`codelabs:orbit:user:${username}:token:${TOKEN_TYPE.ACCESS_TOKEN}:${clientId}`).catch((e) => {
    logger.error('error on fetching redis cached accessToken', e);
    return null;
  });
  logger.trace(`accessToken from cache ${accessToken ? true : false}`);

  let refreshToken: string = await redis.get(`codelabs:orbit:user:${username}:token:${TOKEN_TYPE.REFRESH_TOKEN}:${clientId}`).catch((e) => {
    logger.error('error on fetching redis cached RefreshToken', e);
    return null;
  });
  logger.trace(`refreshToken from cache ${accessToken ? true : false}`);

  if (accessToken && refreshToken) {
    const tokenResponse: TokenResponse = {
      accessToken: JSON.parse(accessToken),
      refreshToken: JSON.parse(refreshToken),
    };
    return successResponse({
      session: tokenResponse,
    });
  } else {
    //cache missed
    return acceptedResponse({
      code: 'ACCESSTOKEN_NOT_FOUND',
      message: 'Access token may be expired. try again in 5 seconds. if did not work try sign in again',
    });
  }
};

export const main = middy(authToken)
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
