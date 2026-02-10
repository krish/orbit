export default {
  snsParameter: {
    Type: 'AWS::SSM::Parameter',
    Properties: {
      //AllowedPattern: String,
      DataType: 'text',
      Description: 'sns topic name',
      Name: '/codelabs/${sls:stage}/auth-service/sns/userSignInTopic',
      Tier: 'Standard',
      Type: 'String',
      Value: {Ref: 'UserSignin'},
      Tags: {
        Project: 'Codelabs',
        Environment: '${sls:stage}',
      },
    },
  },
  orbitKey: {
    Type: 'AWS::SSM::Parameter',
    Properties: {
      //AllowedPattern: String,
      DataType: 'text',
      Description: 'KMS key use to sign and verify Ironhode JWT keys',
      Name: '/codelabs/${sls:stage}/auth-service/keys/orbitKeyId',
      Tier: 'Standard',
      Type: 'String',
      Value: {Ref: 'orbitKey'},
      Tags: {
        Project: 'Codelabs',
        Environment: '${sls:stage}',
      },
    },
  },
  systemParameterKey: {
    Type: 'AWS::SSM::Parameter',
    Properties: {
      //AllowedPattern: String,
      DataType: 'text',
      Description: 'KMS key to encrypt sensitive system parameters',
      Name: '/codelabs/${sls:stage}/auth-service/keys/systemParameterKeyId',
      Tier: 'Standard',
      Type: 'String',
      Value: {Ref: 'SystemParameterKey'},
      Tags: {
        Project: 'Codelabs',
        Environment: '${sls:stage}',
      },
    },
  },
  orbitKeyAlias: {
    Type: 'AWS::SSM::Parameter',
    Properties: {
      //AllowedPattern: String,
      DataType: 'text',
      Description: 'Alias to KMS key to encrypt sensitive system parameters',
      Name: '/codelabs/${sls:stage}/auth-service/keys/orbitKeyIdAlias',
      Tier: 'Standard',
      Type: 'String',
      Value: {Ref: 'orbitKeyAlias'},
      Tags: {
        Project: 'Codelabs',
        Environment: '${sls:stage}',
      },
    },
  },
  systemParameterKeyAlias: {
    Type: 'AWS::SSM::Parameter',
    Properties: {
      //AllowedPattern: String,
      DataType: 'text',
      Description: 'Alias to KMS key to use encrypt sensitive system parameters',
      Name: '/codelabs/${sls:stage}/auth-service/keys/systemParameterKeyIdAlias',
      Tier: 'Standard',
      Type: 'String',
      Value: {Ref: 'SystemParameterKeyAlias'},
      Tags: {
        Project: 'Codelabs',
        Environment: '${sls:stage}',
      },
    },
  },
};
