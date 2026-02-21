import type {AWS, AwsLambdaVpcConfig} from '@serverless/typescript';
import functions from '@functions/index';

const serverlessConfiguration: AWS = {
  service: 'auth-service',
  frameworkVersion: '3',
  plugins: ['serverless-esbuild', 'serverless-offline', 'serverless-iam-roles-per-function', 'serverless-domain-manager'],
  params: {
    dev: {
      domain: 'idp.dev.cloud.codelabs.com',
      certificate: 'arn:aws:acm:ap-southeast-1:374320175743:certificate/507b3921-c492-45f0-9988-dcaeb5993a70',
      securityGroupIds: 'sg-09d543084781c88ba,sg-024c18d8f66a51352',
      subnetIds: 'subnet-066de521652178193,subnet-0bfa30326a9169423',
      apiKey: '${self:provider.apiName}-apikey',
      apiKeyValue: 'dS8glZfOdz89lv3bR2hrL3oRkXhU9JNv10vagoh5',
      rateLimit: 'limit: 1000',
      burstLimit: '50',
      perDayQuota: '1000',
      userpool: 'orbit-dev',
      profile: 'krish',
    },
  },

  provider: {
    name: 'aws',
    runtime: 'nodejs20.x',
    stage: 'dev',
    profile: '${param:profile}',
    stackName: '${self:service}-stack-${self:provider.stage}',
    apiName: '${self:service}-${self:provider.stage}',
    region: 'ap-southeast-1',
    memorySize: 1024,
    timeout: 30,
    endpointType: 'regional',
    vpc: {
      securityGroupIds: {
        'Fn::Split': [',', '${param:securityGroupIds}'],
      },
      subnetIds: {
        'Fn::Split': [',', '${param:subnetIds}'],
      },
    } as unknown as AwsLambdaVpcConfig,
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
      //enable bellow block if need to create API keys
      apiKeys: [
        {
          name: '${param:apiKey}',
          value: '${param:apiKeyValue}',
          description: 'API key use to manage resource policy of all inbound calls',
          enabled: true,
        },
      ],
      /*  resourcePolicy: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: 'execute-api:Invoke',
          Resource: 'execute-api:/*/ /*/*',
        },
        {
          Effect: 'Deny',
          Principal: '*',
          Action: 'execute-api:Invoke',
          Resource: 'execute-api://*/ /*/*',
          Condition: {
            NotIpAddress: {
              'aws:SourceIp': [
                '3.1.95.131',
                '3.0.42.172',
                '52.74.201.147',
                '54.179.192.143',
              ],
            },
          },
        },
      ], */
      usagePlan: {
        quota: {
          limit: 1000000,
          period: 'DAY',
        },
        throttle: {
          rateLimit: 100,
          burstLimit: 200,
        },
      },
    },
    environment: {
      //default variables
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      STAGE: '${sls:stage}',
      REGION: '${self:provider.region}',
      API_GW_ID: {Ref: 'ApiGatewayRestApi'},
      BASE_URL: 'https://idp.${sls:stage}.cloud.codelabs.com',
      BASE_URL_PROD: 'https://idp.live.codelabs.com',

      //resources
      SNS_SIGNIN_TOPIC: '${ssm:/codelabs/${sls:stage}/auth-service/sns/userSignInTopic}', //{Ref: 'UserSignin'},
      ORBIT_SIGN_KEY_ALIAS: '${ssm:/codelabs/${sls:stage}/auth-service/keys/orbitKeyIdAlias}', // {Ref: 'orbitKeyAlias'},
      ORBIT_KEY_ID: '${ssm:/codelabs/${sls:stage}/auth-service/keys/orbitKeyId}', //{Ref: 'orbitKey'},
      POSTGRES_PORT: '${ssm:/codelabs/${sls:stage}/auth-service/database/pg/port}',
      POSTGRES_DATABASE: '${ssm:/codelabs/${sls:stage}/auth-service/database/pg/database}',
      POSTGRES_SCHEMA: '${ssm:/codelabs/${sls:stage}/auth-service/database/pg/schema}',
      POSTGRES_USERNAME: '${ssm:/codelabs/${sls:stage}/auth-service/database/pg/username}',
      USERPOOL_ID: '${ssm:/codelabs/${sls:stage}/auth-service/userpool_id}',
      POSTGRES_CONNECTION_TIMEOUT: '${ssm:/codelabs/${sls:stage}/auth-service/database/pg/connection_timeout}',
      ORBIT_ACCESSTOKEN_VALIDITY_HOURS: '${ssm:/codelabs/${sls:stage}/auth-service/orbit_accesstoken_validity_hours}',
      ORBIT_REFRESHTOKEN_VALIDITY_HOURS: '${ssm:/codelabs/${sls:stage}/auth-service/orbit_refreshtoken_validity_hours}',

      LOG_LEVEL: 'trace',
    },
  },

  functions: functions,
  package: {individually: true},
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk', 'pg-native'],
      target: 'node14',
      define: {'require.resolve': undefined},
      platform: 'node',
      concurrency: 10,
    },
    customDomain: {
      rest: {
        domainName: '${param:domain}',
        certificateArn: '${param:certificate}',
        createRoute53Record: true,
        endpointType: 'regional',
      },
    },
    allowedHttpHeaders: 'Accept,Authorization,Content-Type,Content-Length,x-api-key',
    authorizerTokenCacheDuration: 120,
  },
};

module.exports = serverlessConfiguration;
