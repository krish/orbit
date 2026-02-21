import {TOKEN_TYPE, verify} from '@libs/orbit-token-manager';
import {TokenVerifyResult, validateIdToken} from '@libs/cognito-token-manager';
import {AuthPolicy, PolicyOption} from './policy-service';
import {checkActiveFraudAlert, checkImpossibleTravel} from '@libs/fraud-detection-service';
import middy from '@middy/core';
import ssm from '@middy/ssm';
import {logger} from '@libs/logger-service';
import {APIGatewayEvent, Context} from 'aws-lambda';

logger.info('authorizer loading');

const guard = async (event: APIGatewayEvent, context: Context) => {
  process.env.postgresdb_hostname = context['hostname'];
  process.env.postgresdb_password = context['password'];

  // ── Step 1: Extract JWT token ─────────────────────────────────────────────

  let jwtToken = event.headers.authorization || event.headers.Authorization || '';

  if (!jwtToken) {
    // Check if this is a websocket connection
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

  const options: PolicyOption = {
    region,
    apiId,
    stage,
  };

  // ── Step 2: Validate JWT (ID token or Orbit access token) ─────────────────

  let tokenVerifyResult: TokenVerifyResult;
  let tokenType: string;

  if ((resource === '/token' && httpMethod.toLowerCase() === 'post') || (resource === '/authorize' && httpMethod.toLowerCase() === 'get')) {
    tokenType = 'id';
    logger.info('Request to token endpoint — validating ID token');
    tokenVerifyResult = await validateIdToken(jwtToken).catch((e) => {
      logger.error(e, 'Error during idToken validation:');
      return null;
    });
  } else {
    tokenType = 'access';
    logger.info('Validating Orbit access token');
    tokenVerifyResult = await verify(jwtToken, TOKEN_TYPE.ACCESS_TOKEN).catch((e) => {
      logger.error(e);
      return null;
    });
  }

  logger.debug('Token verify result:', tokenVerifyResult);

  // Reject if token is invalid — fail before any fraud checks
  if (!tokenVerifyResult || !tokenVerifyResult.isValid) {
    logger.info('Token validation failed — returning Unauthorized');
    context.fail('Unauthorized');
    return;
  }

  logger.info(tokenVerifyResult, 'Token valid — proceeding to fraud checks');

  // ── Step 3: Fraud Detection ───────────────────────────────────────────────
  // Both checks run after JWT validation succeeds.
  // The API Gateway policy is ONLY generated if both pass.
  // Fraud checks only apply to Orbit access tokens (not the initial ID token
  // exchange) — the ID token flow is a pre-auth step with no account context yet.

  if (tokenType === 'access') {
    const userId = tokenVerifyResult.userId;
    const requestIp = event.requestContext?.identity?.sourceIp || event.headers['x-forwarded-for']?.split(',')[0].trim() || '';

    logger.info({userId, requestIp}, 'Running fraud detection checks');

    // ── Fraud Check 1: Active Fraud Alert ──────────────────────────────────
    // Queries PostgreSQL for any open fraud alerts on this user account.
    // If an open alert exists, all access is blocked regardless of token validity.
    const fraudAlertCheck = await checkActiveFraudAlert(userId);

    if (!fraudAlertCheck.passed) {
      logger.warn({userId, reason: fraudAlertCheck.reason, alertId: fraudAlertCheck.alertId}, 'Fraud check 1 FAILED: Active fraud alert — blocking request');
      context.fail('Unauthorized');
      return;
    }

    logger.info({userId}, 'Fraud check 1 passed: No active fraud alerts');

    // ── Fraud Check 2: Impossible Travel Detection ─────────────────────────
    // Compares current request IP geo-location against last known login location.
    // Uses Haversine formula to calculate distance and implied travel speed.
    // If speed exceeds 1000 km/h (max commercial flight), raises a fraud alert
    // and blocks the request.
    const travelCheck = await checkImpossibleTravel(userId, requestIp);

    if (!travelCheck.passed) {
      logger.warn({userId, requestIp, reason: travelCheck.reason}, 'Fraud check 2 FAILED: Impossible travel detected — blocking request');
      context.fail('Unauthorized');
      return;
    }

    logger.info({userId, requestIp}, 'Fraud check 2 passed: Travel check clear');
  }

  // ── Step 4: Build IAM Policy ──────────────────────────────────────────────
  // Only reached if JWT is valid AND both fraud checks passed.

  logger.info('All checks passed — generating API Gateway allow policy');

  const policy = new AuthPolicy(tokenVerifyResult.username, accountId, options);

  if (tokenType === 'id') {
    // ID token: only permit the token exchange endpoints
    policy.allowMethod('POST', '/token');
    policy.allowMethod('GET', '/authorize');
  } else if (tokenType === 'access') {
    if (!httpMethod && event.requestContext.routeKey === '$connect') {
      // WebSocket connection
      logger.info('Request is Connect route to socket API — generating single method ARN policy');
      policy.singleMethodArnAllow = event['methodArn'];
    } else {
      // Standard HTTP endpoints
      logger.info('Request is to HTTP endpoint — generating HTTP policy');
      policy.allowMethod('GET', '/me');
      policy.allowMethod('POST', '/appClients');
      policy.allowMethod('DELETE', '/appClients');
      policy.allowMethod('GET', '/appClients');
      policy.allowMethod('POST', '/appClients/credentials');
      policy.allowMethod('DELETE', '/appClients/credentials');
    }
  }

  const authzResponse = policy.build();

  // Attach token context — available as event.requestContext.authorizer downstream
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
    cacheExpiry: 60 * 60 * 1000,
    cacheKey: 'codelabs-ssm-authservice',
  }),
);
