import {clientErrorResponse, serverErrorResponse, successResponse} from '@libs/responses';
import {APIGatewayEvent} from 'aws-lambda';
import middyJsonBodyParser from '@middy/http-json-body-parser';
import * as AWS from 'aws-sdk';
import {logger} from '@libs/logger-service';
import middy from '@middy/core';
AWS.config.update({region: process.env.REGION});
const cognito: AWS.CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
const userPoolId: string = process.env.USERPOOL_ID;

/**
 * It takes an event object, extracts the clientId from the body, and then calls the
 * deleteUserPoolClient method on the cognito object
 * @param {APIGatewayEvent} event - APIGatewayEvent - this is the event that is passed to the lambda
 * function.
 * @returns The response from the cognito.deleteUserPoolClient(params)
 */
const deleteAppClient = async (event: APIGatewayEvent) => {
  const clientId = event.body['clientId'];

  let params: AWS.CognitoIdentityServiceProvider.Types.DeleteUserPoolClientRequest;
  if (!clientId || !clientId.trim()) {
    return clientErrorResponse({message: 'clientId is a required property'});
  }

  params = {
    UserPoolId: userPoolId,
    ClientId: clientId,
  };

  try {
    await cognito
      .deleteUserPoolClient(params)
      .promise()
      .catch((e) => {
        logger.error(e, `error on deleting appclient id: ${clientId}`);
        throw new Error(e.message);
      });
    return successResponse({message: 'appClient deleted successfully'});
  } catch (e) {
    return serverErrorResponse({message: e.message});
  }
};
export const main = middy(deleteAppClient).use(middyJsonBodyParser());
