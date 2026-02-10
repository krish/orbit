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
 * It creates a new app client in the user pool
 * @param {APIGatewayEvent} event - APIGatewayEvent - this is the event that is passed to the lambda
 * function.
 */
const createAppClient = async (event: APIGatewayEvent) => {
  const clientName = event.body['clientName'];
  const isClientCredentialApp = event.body['isClientCredentialApp'];
  let params: AWS.CognitoIdentityServiceProvider.Types.CreateUserPoolClientRequest;
  if (!clientName || !clientName.trim()) {
    return clientErrorResponse({message: 'clientName is a required property'});
  }
  if (isClientCredentialApp) {
    params = {
      UserPoolId: userPoolId,
      GenerateSecret: true,
      AllowedOAuthFlows: ['client_credentials'],
      AllowedOAuthScopes: ['codelabs/signInClientCredential'],
      ClientName: clientName,
      ExplicitAuthFlows: ['ALLOW_ADMIN_USER_PASSWORD_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH'],
      SupportedIdentityProviders: ['COGNITO'],
      EnableTokenRevocation: false,
      WriteAttributes: [],
    };
  } else {
    params = {
      UserPoolId: userPoolId,
      GenerateSecret: false,
      AllowedOAuthFlows: ['code'],
      ClientName: clientName,
      ExplicitAuthFlows: ['ALLOW_CUSTOM_AUTH', 'ALLOW_REFRESH_TOKEN_AUTH', 'ALLOW_USER_SRP_AUTH'],
      SupportedIdentityProviders: ['Brandix'],
      EnableTokenRevocation: true,
      CallbackURLs: event.body['CallbackURLs'] || [],
      LogoutURLs: event.body['LogoutURLs'] || [],
      AllowedOAuthScopes: ['email', 'openid', 'phone', 'profile'],
      WriteAttributes: [],
    };
  }

  const appClients = await cognito.listUserPoolClients({UserPoolId: userPoolId}).promise();
  const existingClient = appClients.UserPoolClients.find((client) => client.ClientName === clientName);
  if (existingClient) {
    logger.error(`App client with name ${clientName} already exists with ID ${existingClient.ClientId}`);
    return clientErrorResponse({message: `there is a client already exsist from this name under id : ${existingClient.ClientId}`});
  }
  try {
    const response = await cognito
      .createUserPoolClient(params)
      .promise()
      .catch((e) => {
        logger.error(e, 'error on creating app client');
        throw new Error('There is an error on creating client. please check logs');
      });
    return successResponse(response);
  } catch (e) {
    return serverErrorResponse({message: e.message});
  }
};
export const main = middy(createAppClient).use(middyJsonBodyParser());
