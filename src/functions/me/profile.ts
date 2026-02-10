import {clientErrorResponse, serverErrorResponse, successResponse} from '@libs/responses';
import middy from '@middy/core';
import ssm from '@middy/ssm';
import middyJsonBodyParser from '@middy/http-json-body-parser';

import {Profile} from 'src/types/main.types';
import {cacheUserProfile} from './user-service';
import Redis from 'ioredis';
import {getRedisConnection} from '@libs/cache-manager';
import {logger} from '@libs/logger-service';

const me = async (event, context) => {
  process.env.postgresdb_hostname = context.hostname;
  process.env.postgresdb_password = context.password;

  const username = event.requestContext.authorizer.username;
  logger.info('requested user is :', username);
  if (!username) {
    return clientErrorResponse({
      error: 'username is missing in request or invalid token',
    });
  }
  //fetch from cache;
  const redis: Redis = await getRedisConnection().catch((e) => {
    logger.error(e);
    return null;
  });
  let userString: string = await redis.get(`codelabs:orbit:user:${username}:profile`).catch((e) => {
    logger.error('error on fetching redis cached profile', e);
    return null;
  });
  //need to parse to json as if not it will double stringify
  let user: Profile;
  if (userString) {
    user = JSON.parse(userString);
  } else {
    user = await cacheUserProfile(username, 24 * 3600);
  }
  if (user)
    return successResponse({
      user,
    });
  else
    return serverErrorResponse({
      error: 'Error on fetching user profile. please refer logs',
    });
};

export const main = middy(me)
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
