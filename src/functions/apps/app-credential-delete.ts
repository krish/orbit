import {clientErrorResponse, serverErrorResponse, successResponse} from '@libs/responses';
import {APIGatewayEvent} from 'aws-lambda';
import middyJsonBodyParser from '@middy/http-json-body-parser';
import * as AWS from 'aws-sdk';
import {logger} from '@libs/logger-service';
import middy from '@middy/core';
AWS.config.update({region: process.env.REGION});
const cognito: AWS.CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
const userPoolId: string = process.env.USERPOOL_ID;

const deleteAppCredential = async (event: APIGatewayEvent) => {
  const credentialId = event.body['credentialId'];

  let params: AWS.CognitoIdentityServiceProvider.Types.AdminDeleteUserRequest;
  if (!credentialId || !credentialId.trim()) {
    return clientErrorResponse({message: 'credentialId is a required property'});
  }

  params = {
    UserPoolId: userPoolId,
    Username: credentialId,
  };

  try {
    await cognito
      .adminDeleteUser(params)
      .promise()
      .catch((e) => {
        logger.error(e, `error on deleting credential id: ${credentialId}`);
        throw new Error(e.message);
      });
    return successResponse({message: 'Credential deleted successfully'});
  } catch (e) {
    return serverErrorResponse({message: e.message});
  }
};
export const main = middy(deleteAppCredential).use(middyJsonBodyParser());
