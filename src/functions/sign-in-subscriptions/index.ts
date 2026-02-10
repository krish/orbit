import {handlerPath} from '@libs/handler-resolver';

const tokenCacheAgent = {
  handler: `${handlerPath(__dirname)}/token-cache-agent.main`,
  name: '${self:service}-${self:provider.stage}-token-cache-agent',
  description: 'Subscriber for cognito token generation to generate ironhode token',
  iamRoleStatements: [
    {
      Effect: 'Allow',
      Action: ['sns:Subscribe'],
      Resource: '${ssm:/codelabs/${sls:stage}/auth-service/sns/userSignInTopic}',
    },
    {
      Effect: 'Allow',
      Action: ['ssm:GetParameter', 'ssm:GetParameters'],
      Resource: 'arn:aws:ssm:ap-southeast-1:*:*',
    },
  ],
  events: [
    {
      sns: {
        arn: '${ssm:/codelabs/${sls:stage}/auth-service/sns/userSignInTopic}',
        topicName: 'codelabs-UserSignInTopic',
      },
    },
  ],
};
const profileCacheAgent = {
  handler: `${handlerPath(__dirname)}/profile-cache-agent.main`,
  name: '${self:service}-${self:provider.stage}-profile-cache-agent',
  description: 'Subscriber for cognito token generation to generate profile',
  iamRoleStatements: [
    {
      Effect: 'Allow',
      Action: ['sns:Subscribe'],
      Resource: '${ssm:/codelabs/${sls:stage}/auth-service/sns/userSignInTopic}',
    },
    {
      Effect: 'Allow',
      Action: ['ssm:GetParameter', 'ssm:GetParameters'],
      Resource: 'arn:aws:ssm:ap-southeast-1:*:*',
    },
  ],
  events: [
    {
      sns: {
        arn: '${ssm:/codelabs/${sls:stage}/auth-service/sns/userSignInTopic}',
        topicName: 'codelabs-UserSignInTopic',
      },
    },
  ],
};
const userSyncAgent = {
  handler: `${handlerPath(__dirname)}/user-sync-agent.main`,
  name: '${self:service}-${self:provider.stage}-user-sync-agent',
  description: 'Subscriber for sync users Orbit signIn',
  iamRoleStatements: [
    {
      Effect: 'Allow',
      Action: ['sns:Subscribe'],
      Resource: '${ssm:/codelabs/${sls:stage}/auth-service/sns/userSignInTopic}',
    },
    {
      Effect: 'Allow',
      Action: ['ssm:GetParameter', 'ssm:GetParameters'],
      Resource: 'arn:aws:ssm:ap-southeast-1:*:*',
    },
  ],
  events: [
    {
      sns: {
        arn: '${ssm:/codelabs/${sls:stage}/auth-service/sns/userSignInTopic}',
        topicName: 'codelabs-UserSignInTopic',
      },
    },
  ],
};
export {tokenCacheAgent, profileCacheAgent, userSyncAgent};
