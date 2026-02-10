import {handlerPath} from '@libs/handler-resolver';

export default {
  handler: `${handlerPath(__dirname)}/guard.main`,
  name: '${self:service}-${self:provider.stage}-lambdaAuthorizer',
  description: 'Lambda Authorizer for secure API on API gateway',
  iamRoleStatements: [
    {
      Effect: 'Allow',
      Action: ['ssm:GetParameter', 'ssm:GetParameters'],
      Resource: 'arn:aws:ssm:ap-southeast-1:*:*',
    },
  ],
};
