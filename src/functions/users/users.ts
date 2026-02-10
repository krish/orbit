import {successResponse} from '@libs/responses';
import middy from '@middy/core';
import ssm from '@middy/ssm';
import middyJsonBodyParser from '@middy/http-json-body-parser';
import * as AWS from 'aws-sdk';
const allUsers = async (event, context) => {
  const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
    credentials: new AWS.Credentials(context.cognitoAccesskeyId, context.cognitoSecret),
  });
  const paginationToken = event.queryStringParameters?.page;
  let params: any = {
    Limit: 60,
    UserPoolId: process.env.USERPOOL_ID,
  };
  if (paginationToken) {
    params.PaginationToken = paginationToken;
  }

  const users = await new Promise((resolve, reject) => {
    cognitoIdentityServiceProvider.listUsers(params, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });

  return successResponse({
    message: users,
  });
};

export const main = middy(allUsers)
  .use(middyJsonBodyParser())
  .use(
    ssm({
      fetchData: {
        cognitoAccesskeyId: `/codelabs/${process.env.STAGE}/auth-service/cognito/accessKey`,
        cognitoSecret: `/codelabs/${process.env.STAGE}/auth-service/cognito/secret`,
      },
      setToContext: true,
      cacheExpiry: 60 * 60 * 1000, //though it set to 60 max time would be container time
      cacheKey: 'codelabs-ssm-authservice',
    }),
  );
