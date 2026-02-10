import {clientErrorResponse, serverErrorResponse, successResponse} from '@libs/responses';
import {APIGatewayEvent} from 'aws-lambda';
import middyJsonBodyParser from '@middy/http-json-body-parser';
import * as AWS from 'aws-sdk';
import {logger} from '@libs/logger-service';
import middy from '@middy/core';
import * as gen from 'generate-password';

AWS.config.update({region: process.env.REGION});
const cognito: AWS.CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
const userPoolId: string = process.env.USERPOOL_ID;

const createAppCredential = async (event: APIGatewayEvent) => {
  const clientName = event.body['clientName'];

  if (!clientName || !clientName.trim()) {
    return clientErrorResponse({message: 'clientName is a required property'});
  }
  const password = `@${gen.generate({
    length: 80,
    numbers: true,
    lowercase: true,
    uppercase: true,
  })}`;
  const username = gen.generate({
    length: 42,
    lowercase: true,
    uppercase: true,
  });
  const email = `${clientName}@codelabs.app`;
  try {
    const params: AWS.CognitoIdentityServiceProvider.Types.AdminCreateUserRequest = {
      UserPoolId: userPoolId,
      Username: username,
      TemporaryPassword: password,
      UserAttributes: [
        {Name: 'email', Value: email},
        {Name: 'name', Value: clientName},
        {Name: 'family_name', Value: 'Codelabs'},
      ],
    };
    const newUser = await cognito
      .adminCreateUser(params)
      .promise()
      .catch((e) => {
        logger.error(e, `error on creating app credentials`);
        throw new Error(e.message);
      });

    return successResponse({
      name: clientName,
      id: username,
      secret: password,
      email: email,
      createdOn: newUser.User.UserCreateDate,
      active: newUser.User.Enabled,
    });
  } catch (e) {
    return serverErrorResponse({message: e.message});
  }
};

export const main = middy(createAppCredential).use(middyJsonBodyParser());
