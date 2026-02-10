import {handlerPath} from '@libs/handler-resolver';

export default {
  handler: `${handlerPath(__dirname)}/profile.main`,
  name: '${self:service}-${self:provider.stage}-profile',
  description: 'Get profile of the requested user',
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
        path: '/me',
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
