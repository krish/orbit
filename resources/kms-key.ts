export default {
  orbitKey: {
    Type: 'AWS::KMS::Key',
    Properties: {
      Description: 'Key which is used to sign and verify orbit tokens',
      Enabled: true,
      EnableKeyRotation: false, //only support for symmetric
      // KeyPolicy: 'Json',
      KeyPolicy: {
        Id: 'orbit-signkey-policy-${sls:stage}',
        Statement: {
          Effect: 'Allow',
          Principal: {
            AWS: [
              //'arn:aws:iam::374320175743:user/serverless-deployement-admin',
              //'arn:aws:iam::374320175743:role/auth-service-dev-refreshToAuth-ap-southeast-1-lambdaRole',
              '*',
            ],
          },
          Action: ['kms:*'],
          Resource: '*',
        },
      },
      KeySpec: 'RSA_2048',
      KeyUsage: 'SIGN_VERIFY',
      MultiRegion: false,
      PendingWindowInDays: 7,
      //"Tags" : [ 'Tag, ...' ]
    },
  },
  SystemParameterKey: {
    Type: 'AWS::KMS::Key',
    Properties: {
      Description: 'Key which is used to encrypt Parameters',
      Enabled: true,
      EnableKeyRotation: false, //only support for symmetric
      // KeyPolicy: 'Json',
      KeyPolicy: {
        Id: 'System-Parameterkey-policy-${sls:stage}',
        Statement: {
          Effect: 'Allow',
          Principal: {
            AWS: [
              // 'arn:aws:iam::374320175743:user/serverless-deployement-admin',
              //'arn:aws:iam::374320175743:role/auth-service-dev-refreshToAuth-ap-southeast-1-lambdaRole',
              '*',
            ],
          },
          Action: ['kms:*'],
          Resource: '*',
        },
      },
      KeySpec: 'SYMMETRIC_DEFAULT',
      KeyUsage: 'ENCRYPT_DECRYPT',
      MultiRegion: false,
      PendingWindowInDays: 7,
      //"Tags" : [ 'Tag, ...' ]
    },
  },
};
