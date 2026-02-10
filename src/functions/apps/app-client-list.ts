import {serverErrorResponse, successResponse} from '@libs/responses';
import * as AWS from 'aws-sdk';
import {logger} from '@libs/logger-service';
import middy from '@middy/core';
AWS.config.update({region: process.env.REGION});
const cognito: AWS.CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
const userPoolId: string = process.env.USERPOOL_ID;

/**
 * It lists all the app clients in the user pool
 * @returns A list of app clients
 */
const listAppClients = async () => {
  try {
    const appClients = await cognito
      .listUserPoolClients({UserPoolId: userPoolId})
      .promise()
      .catch((e) => {
        logger.error(e, 'error on listing app clients');
        throw new Error(e.message);
      });
    return successResponse(appClients);
  } catch (e) {
    return serverErrorResponse({message: e.message});
  }
};
export const main = middy(listAppClients);
