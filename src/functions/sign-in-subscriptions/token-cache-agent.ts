import {accessTokenValidityHours, TOKEN_TYPE} from '@libs/orbit-token-manager';
import middy from '@middy/core';
import {getAccessToken, getRefreshToken} from './token.service';
import ssm from '@middy/ssm';
import middyJsonBodyParser from '@middy/http-json-body-parser';
import Redis from 'ioredis';
import {getRedisConnection} from '@libs/cache-manager';
import {logger} from '@libs/logger-service';

const pretoken = async (event, context) => {
  process.env.postgresdb_hostname = context.hostname;
  process.env.postgresdb_password = context.password;

  logger.debug('profile cache event triggered');

  logger.debug(JSON.stringify(event.Records));

  /* Iterate over each messages and generate tokens */
  for (let element of event.Records) {
    let message = JSON.parse(element.Sns.Message);
    let email: string = message?.request?.userAttributes?.email;
    let clientId: string = message?.callerContext?.clientId;

    const accessToken = await getAccessToken(email, clientId).catch((e) => logger.error(e, 'Error on creating accesstoken'));

    const refreshToken = await getRefreshToken(email, clientId).catch((e) => logger.error('Error on creating refreshToken', e));
    const redis: Redis = await getRedisConnection().catch((e) => {
      logger.error(e);
      return null;
    });

    /* This is a function that will cache the access token for 1 hour. */
    const cached_a = await redis.set(
      `codelabs:orbit:user:${email}:token:${TOKEN_TYPE.ACCESS_TOKEN}:${clientId}`,
      JSON.stringify(accessToken),
      'EX',
      accessTokenValidityHours * 3600,
    );
    //this cached for serve on request along with accessToken. but cached payload will not be used on anywhere
    const cached_r = await redis.set(
      `codelabs:orbit:user:${email}:token:${TOKEN_TYPE.REFRESH_TOKEN}:${clientId}`,
      JSON.stringify(refreshToken),
      'EX',
      accessTokenValidityHours * 3600, //refresh token also OK to expire with accesstoken as we do not use cached refresh token
    );
    logger.info('cached results :', cached_a + ' ' + cached_r);
  }

  return;
};

export const main = middy(pretoken)
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
