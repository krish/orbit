import {handlerPath} from '@libs/handler-resolver';

const oidc = {
  handler: `${handlerPath(__dirname)}/oidc.main`,
  name: '${self:service}-${self:provider.stage}-oidc',
  description: 'OpenID configuration endpoint',
  events: [
    {
      http: {
        method: 'get',
        path: '.well-known/openid-configuration',
        cors: {
          origin: '*',
          headers: ['${self:custom.allowedHttpHeaders}'],
        },
        private: false,
      },
    },
  ],
};
const jwks = {
  handler: `${handlerPath(__dirname)}/jwks.main`,
  name: '${self:service}-${self:provider.stage}-jwks',
  description: 'JWKS endpoint',
  events: [
    {
      http: {
        method: 'get',
        path: '.well-known/jwks',
        cors: {
          origin: '*',
          headers: ['${self:custom.allowedHttpHeaders}'],
        },
        private: false,
      },
    },
  ],
};
export {oidc, jwks};
