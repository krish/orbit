import {handlerPath} from '@libs/handler-resolver';
import schema from './schema';

const createClient = {
  handler: `${handlerPath(__dirname)}/app-client.main`,
  name: '${self:service}-${self:provider.stage}-createAppClient',
  description: 'Create new Appclient',
  iamRoleStatements: [
    {
      Effect: 'Allow',
      Action: ['cognito-idp:CreateUserPoolClient', 'cognito-idp:ListUserPoolClients'],
      Resource: `arn:aws:cognito-idp:ap-southeast-1:*:*`,
    },
  ],
  events: [
    {
      http: {
        method: 'post',
        path: '/appClients',
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
const deleteClient = {
  handler: `${handlerPath(__dirname)}/app-client-delete.main`,
  name: '${self:service}-${self:provider.stage}-deleteAppClient',
  description: 'Delete an Appclient',
  iamRoleStatements: [
    {
      Effect: 'Allow',
      Action: ['cognito-idp:DeleteUserPoolClient'],
      Resource: `arn:aws:cognito-idp:ap-southeast-1:*:*`,
    },
  ],
  events: [
    {
      http: {
        method: 'delete',
        path: '/appClients',
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
const listClients = {
  handler: `${handlerPath(__dirname)}/app-client-list.main`,
  name: '${self:service}-${self:provider.stage}-listAppClients',
  description: 'List Appclients',
  iamRoleStatements: [
    {
      Effect: 'Allow',
      Action: ['cognito-idp:ListUserPoolClients'],
      Resource: `arn:aws:cognito-idp:ap-southeast-1:*:*`,
    },
  ],
  events: [
    {
      http: {
        method: 'get',
        path: '/appClients',
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
const createClientCredentials = {
  handler: `${handlerPath(__dirname)}/app-credential.main`,
  name: '${self:service}-${self:provider.stage}-createAppCredential',
  description: 'Create App Credentials',
  iamRoleStatements: [
    {
      Effect: 'Allow',
      Action: ['cognito-idp:AdminCreateUser'],
      Resource: 'arn:aws:cognito-idp:ap-southeast-1:*:*',
    },
  ],
  events: [
    {
      http: {
        method: 'post',
        path: '/appClients/credentials',
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

const deleteClientCredentials = {
  handler: `${handlerPath(__dirname)}/app-credential-delete.main`,
  name: '${self:service}-${self:provider.stage}-deleteAppCredential',
  description: 'Delete App Credentials',
  iamRoleStatements: [
    {
      Effect: 'Allow',
      Action: ['cognito-idp:AdminDeleteUser'],
      Resource: 'arn:aws:cognito-idp:ap-southeast-1:*:*',
    },
  ],
  events: [
    {
      http: {
        method: 'delete',
        path: '/appClients/credentials',
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

const appToken = {
  handler: `${handlerPath(__dirname)}/app-token.main`,
  name: '${self:service}-${self:provider.stage}-appToken',
  description: 'get token for app credentials',
  iamRoleStatements: [
    {
      Effect: 'Allow',
      Action: ['cognito-idp:AdminInitiateAuth', 'cognito-idp:AdminRespondToAuthChallenge'],
      Resource: 'arn:aws:cognito-idp:ap-southeast-1:*:*',
    },
  ],
  events: [
    {
      http: {
        method: 'post',
        path: 'token/app',
        request: {
          schemas: {
            'application/json': schema,
          },
        },
        cors: {
          origin: '*',
          headers: ['${self:custom.allowedHttpHeaders}'],
        },
        private: true,
      },
    },
  ],
};
export {createClient, deleteClient, listClients, createClientCredentials, deleteClientCredentials, appToken};
