export default {
  UserSignin: {
    Type: 'AWS::SNS::Topic',
    Properties: {
      TopicName: 'codelabsexternal2-${sls:stage}-UserSignInTopic',
    },
  },
};
