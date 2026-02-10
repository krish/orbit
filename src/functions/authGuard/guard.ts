import {TOKEN_TYPE, verify} from '@libs/orbit-token-manager';
import {TokenVerifyResult, validateIdToken} from '@libs/cognito-token-manager';
import {AuthPolicy, PolicyOption} from './policy-service';
import middy from '@middy/core';
import ssm from '@middy/ssm';
import {logger} from '@libs/logger-service';
import {APIGatewayEvent, Context} from 'aws-lambda';
logger.info('authorizer loading');
const guard = async (event: APIGatewayEvent, context: Context) => {
  process.env.postgresdb_hostname = context['hostname'];
  process.env.postgresdb_password = context['password'];

  let jwtToken = event.headers.authorization || event.headers.Authorization || '';

  if (!jwtToken) {
    //check if this is websocket connection
    if (event.headers['Connection'] === 'upgrade' && event.headers['Upgrade'] === 'websocket' && event.requestContext.routeKey === '$connect') {
      if (event.queryStringParameters.kh) {
        jwtToken = event.queryStringParameters.kh;
      } else {
        logger.error('Authorization token is missing on web socket connection request');
        return Promise.reject(new Error('Authorization token is missing on web socket connection request'));
      }
    } else {
      logger.error('Authorization header is missing');
      return Promise.reject(new Error('Authorization information missing'));
    }
  }

  const region = event['methodArn'].split(':')[3];
  const accountId = event['methodArn'].split(':')[4];
  const {apiId, stage, httpMethod} = event.requestContext;
  const resource = event.requestContext.resourcePath;
  //logger.info(`current resouce request is ${resource}`);
  //logger.info(`method ARN is ${event.methodArn}`);
  //logger.info(event, ' is the event');
  const options: PolicyOption = {
    region,
    apiId,
    stage,
  };

  let tokenVerifyResult: TokenVerifyResult;
  let tokenType: string;

  if ((resource === '/token' && httpMethod.toLowerCase() === 'post') || (resource === '/authorize' && httpMethod.toLowerCase() === 'get')) {
    //this means needs to validate id token
    tokenType = 'id';
    logger.info('reques to token endpoint. validating ID token');
    tokenVerifyResult = await validateIdToken(jwtToken).catch((e) => {
      logger.error(e, 'Error during idToken validation:');
      return null;
    });
  } else {
    //validate orbit token\
    tokenType = 'access';
    logger.info('validating IHT');
    /*     tokenVerifyResult = await validateorbitToken(jwtToken).catch((e) => {
      logger.error('Error during idToken validation:', e);
      return null;
    }); */
    tokenVerifyResult = await verify(jwtToken, TOKEN_TYPE.ACCESS_TOKEN).catch((e) => {
      logger.error(e);
      return null;
    });
  }
  logger.debug('token verify results is :', tokenVerifyResult);
  //if either token is not valid need to fail
  if (!tokenVerifyResult || !tokenVerifyResult.isValid) {
    logger.info('token validation failed. return unauthorized');
    context.fail('Unauthorized');
    return;
  }

  logger.info(tokenVerifyResult, 'returned claim');

  const policy = new AuthPolicy(tokenVerifyResult.username, accountId, options);

  /* Adding the resource and method to the policy.
   //policy.allowMethod(httpMethod, resource);
  This is the ideal way to proceed if we control API access. 
 */

  /*if user sends id token then only id token related endpoints should be granted. 
  otherwise use can invoke accesstoken required endpoints also using id token during caching period */
  if (tokenType === 'id') {
    policy.allowMethod('POST', '/token');
    policy.allowMethod('GET', '/authorize');
  } else if (tokenType === 'access') {
    if (!httpMethod && event.requestContext.routeKey === '$connect') {
      //this mean its websocket request
      logger.info(`request is Connect route to socket API. generating single method ARN policy`);
      policy.singleMethodArnAllow = event['methodArn'];
    } else {
      logger.info(`request is to HTTP endpoint. generating HTTP policy`);
      policy.allowMethod('GET', '/me');
      policy.allowMethod('POST', '/appClients');
      policy.allowMethod('DELETE', '/appClients');
      policy.allowMethod('GET', '/appClients');
      policy.allowMethod('POST', '/appClients/credentials');
      policy.allowMethod('DELETE', '/appClients/credentials');
    }
  }
  const authzResponse = policy.build();

  //this can refer as event.requestContext.authorizer
  authzResponse['context'] = {
    username: tokenVerifyResult.username,
    userId: tokenVerifyResult.userId ? tokenVerifyResult.userId : '',
    clientId: tokenVerifyResult.clientId,
    isValidToken: tokenVerifyResult.isValid,
    expiredUtc: tokenVerifyResult.expiredUtc.toString(),
    isError: tokenVerifyResult.error ? true : false,
  };
  logger.info(authzResponse['context']);
  logger.info(JSON.stringify(authzResponse));
  return authzResponse;
};

export const main = middy(guard).use(
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
