import {handlerPath} from '@libs/handler-resolver';
enum triggers {
  PreSignUp = 'PreSignUp',
  PreTokenGeneration = 'PreTokenGeneration',
}

export default {
  handler: `${handlerPath(__dirname)}/preToken.main`,

  name: '${self:service}-${self:provider.stage}-preToken',
  description: 'Trigger on token generation in event',
  iamRoleStatements: [
    {
      Effect: 'Allow',
      Action: ['sns:Publish'],
      Resource: '${ssm:/codelabs/${sls:stage}/auth-service/sns/userSignInTopic}',
    },
  ],
  events: [
    {
      cognitoUserPool: {
        pool: '${param:userpool}',
        trigger: triggers.PreTokenGeneration,
        existing: true,
        forceDeploy: true,
      },
    },
  ],
};
