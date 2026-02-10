import {successResponse} from '@libs/responses';
import {APIGatewayEvent} from 'aws-lambda';
import middyJsonBodyParser from '@middy/http-json-body-parser';
import * as AWS from 'aws-sdk';
import * as crypto from 'crypto';
import middy from '@middy/core';
import {logger} from '@libs/logger-service';
import * as util from 'util';

AWS.config.update({region: process.env.REGION});

const cognito: AWS.CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({apiVersion: '2016-04-18'});
const userPoolId: string = process.env.USERPOOL_ID;

const adminInitiateAuthAsync = util.promisify(cognito.adminInitiateAuth).bind(cognito);
const adminRespondToAuthChallengeAsync = util.promisify(cognito.adminRespondToAuthChallenge).bind(cognito);

const getAppToken = async (event: APIGatewayEvent) => {
  const clientId = event.body['clientId'];
  const clientSecret = event.body['clientSecret'];
  const username = event.body['username'];
  const password = event.body['password'];
  let idToken: string;
  let accessToken: string;
  let refreshToken: string;
  const authParams = {
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    ClientId: clientId,
    UserPoolId: userPoolId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
      SECRET_HASH: getSecretHash(username, clientId, clientSecret),
    },
  };
  const data = await adminInitiateAuthAsync(authParams);
  if (data.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
    logger.info('User must provide a new password.');
    const authParams = {
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      ClientId: clientId,
      UserPoolId: userPoolId,
      ChallengeResponses: {
        USERNAME: username,
        NEW_PASSWORD: password,
        SECRET_HASH: getSecretHash(username, clientId, clientSecret),
      },
      Session: data.Session,
    };
    const newPasswordData = await adminRespondToAuthChallengeAsync(authParams);
    logger.info(`password reset and appToken successfully generated to ${username}`);
    idToken = newPasswordData.AuthenticationResult.IdToken;
    accessToken = newPasswordData.AuthenticationResult.AccessToken;
    refreshToken = newPasswordData.AuthenticationResult.RefreshToken;
  } else {
    logger.info(`appToken successfully generated to ${username}`);
    idToken = data.AuthenticationResult.IdToken;
    accessToken = data.AuthenticationResult.AccessToken;
    refreshToken = data.AuthenticationResult.RefreshToken;
  }
  return successResponse({idToken, accessToken, refreshToken});
};
function getSecretHash(username, clientId, clientSecret) {
  const message = username + clientId;
  const hmac = crypto.createHmac('sha256', clientSecret);
  hmac.update(message);
  return hmac.digest('base64');
}

export const main = middy(getAppToken).use(middyJsonBodyParser());
