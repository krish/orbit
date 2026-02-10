import Redis from 'ioredis';
import {logger} from './logger-service';
import * as AWS from 'aws-sdk';
AWS.config.update({region: 'ap-southeast-1'});
const ssm = new AWS.SSM();

let redis: Redis;

const getRedisConnection = async (): Promise<Redis> => {
  if (redis) {
    logger.info('Redis connection already available. reuse exsisting connection');
    return redis;
  } else {
    logger.info('No connection available. Attempting to make new redis connection');
  }
  //fetch values from SSM
  const redisHostPath = `/codelabs/${process.env.STAGE}/auth-service/database/redis/host`;
  const redisPortPath = `/codelabs/${process.env.STAGE}/auth-service/database/redis/port`;
  const redisUserNamePath = `/codelabs/${process.env.STAGE}/auth-service/database/redis/username`;
  const redisPasswordPath = `/codelabs/${process.env.STAGE}/auth-service/database/redis/password`;

  const redisHostromise = ssm
    .getParameter({
      Name: redisHostPath,
      WithDecryption: true,
    })
    .promise();
  const redisPortPromise = ssm
    .getParameter({
      Name: redisPortPath,
    })
    .promise();
  const redisUsernamePromise = ssm
    .getParameter({
      Name: redisUserNamePath,
      WithDecryption: true,
    })
    .promise();
  const redisPasswordPromise = ssm
    .getParameter({
      Name: redisPasswordPath,
      WithDecryption: true,
    })
    .promise();
  let redisConfigurations = null;
  let redisUserName: string = '';
  let redisPassword: string = '';
  await Promise.all([redisHostromise, redisPortPromise, redisUsernamePromise, redisPasswordPromise]).then(
    ([hostnameResult, portResult, usernameResult, passwordResult]) => {
      const redisHost = hostnameResult.Parameter.Value;
      const redisPort = portResult.Parameter.Value;
      redisUserName = usernameResult.Parameter.Value;
      redisPassword = passwordResult.Parameter.Value;

      redisConfigurations = {
        host: redisHost,
        port: +redisPort, // Redis port
        username: redisUserName,
        password: redisPassword,
        lazyConnect: false,
        tls: {},
      };
    },
  );

  //DO NOT uncomment bellow line on production as this print credentials to log

  //logger.debug(redisConfigurations, 'redis configurations');
  redis = new Redis(redisConfigurations);

  redis.on('error', function (e) {
    logger.error(e, 'error from on error');
    throw new Error(e);
  });
  redis.on('connect', async () => {
    logger.trace('connected to redis. verifying AUTH');
    const result = await redis.auth(redisUserName, redisPassword).catch((e) => {
      logger.error(e, 'Error on redis auth');
      redis.disconnect();
      throw new Error('Redis connection failed. refer previous logs');
    });
    if (result) {
      logger.info({result}, 'AUTH verification success');
    }
  });
  return redis;
  /*Purpose of bellow block is to verify the connection
 comment above retuen statement and Enable this block if experiance ANY connectivity issues*/

  /*  const pong = await redis.ping();
  if (pong) {
    logger.info({returnFromRedis: pong}, 'redis connection verified');
    return redis;
  } else throw new Error('Redis connection failed. refer previous logs'); */
};

export {getRedisConnection};
