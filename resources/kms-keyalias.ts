export default {
  orbitKeyAlias: {
    Type: 'AWS::KMS::Alias',
    Properties: {
      AliasName: 'alias/orbit-jwt-key',
      TargetKeyId: {Ref: 'orbitKey'},
    },
  },
  SystemParameterKeyAlias: {
    Type: 'AWS::KMS::Alias',
    Properties: {
      AliasName: 'alias/system-parameter-key',
      TargetKeyId: {Ref: 'SystemParameterKey'},
    },
  },
};
