import {handlerPath} from '@libs/handler-resolver';

export default {
  handler: `${handlerPath(__dirname)}/users.main`,
  name: '${self:service}-${self:provider.stage}-users',
  description: 'Fetch all users from cognito',
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
        path: '/users',
        cors: {
          origin: '*',
          headers: ['${self:custom.allowedHttpHeaders}'],
        },
        private: true,
      },
    },
  ],
};
