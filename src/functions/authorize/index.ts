import {handlerPath} from '@libs/handler-resolver';
import schema from './schema';

const refreshToAuth = {
  handler: `${handlerPath(__dirname)}/authzRenew.main`,
  name: '${self:service}-${self:provider.stage}-authzRenew',
  description: 'Renew Access token by providing refresh token',
  iamRoleStatements: [
    {
      Effect: 'Allow',
      Action: ['ssm:GetParameter', 'ssm:GetParameters'],
      Resource: 'arn:aws:ssm:ap-southeast-1:*:*',
    },
  ],
  events: [
    {
      http: {
        method: 'post',
        path: 'token',
        request: {
          schemas: {
            'application/json': schema,
          },
        },
        cors: {
          origin: '*',
          headers: ['${self:custom.allowedHttpHeaders}'],
        },
        authorizer: {
          name: 'guard',
          resultTtlInSeconds: Number('${self:custom.authorizerTokenCacheDuration}'),
          identitySource: 'method.request.header.Authorization',
          type: 'request',
        },
        private: true,
      },
    },
  ],
};
const authToken = {
  handler: `${handlerPath(__dirname)}/authz.main`,
  name: '${self:service}-${self:provider.stage}-authz',
  description: 'Provice Access token for the cognito ID token',
  iamRoleStatements: [
    {
      Effect: 'Allow',
      Action: ['ssm:GetParameter', 'ssm:GetParameters'],
      Resource: 'arn:aws:ssm:ap-southeast-1:*:*',
    },
  ],
  events: [
    {
      http: {
        method: 'get',
        path: 'authorize',
        cors: {
          origin: '*',
          headers: ['${self:custom.allowedHttpHeaders}'],
        },
        authorizer: {
          name: 'guard',
          resultTtlInSeconds: Number('${self:custom.authorizerTokenCacheDuration}'),
          identitySource: 'method.request.header.Authorization',
          type: 'request',
        },
        private: true,
      },
    },
  ],
};
export {refreshToAuth, authToken};
