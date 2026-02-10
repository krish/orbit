import {middyfy} from '@libs/lambda';
import {successResponse} from '@libs/responses';

import OidcConfig from './oidc.response';
let baseURL: string;
if (process.env.STAGE == 'prod') {
  baseURL = process.env.BASE_URL_PROD;
} else {
  baseURL = process.env.BASE_URL;
}

const oidc = async () => {
  let oidc = new OidcConfig();
  oidc.authorization_endpoint = `${baseURL}/authorize`;
  oidc.access_token_signing_alg_values_supported = ['RS512'];
  oidc.issuer = `${baseURL}`;
  oidc.jwks_uri = `${baseURL}/.well-known/jwks`;
  oidc.response_types_supported = ['token'];
  oidc.scopes_supported = ['openid'];
  oidc.subject_types_supported = ['public'];
  oidc.token_endpoint = `${baseURL}/token`;
  oidc.token_endpoint_methods_supported = ['get'];
  oidc.userinfo_endpoint = `${baseURL}/me`;

  return successResponse(oidc);
};

export const main = middyfy(oidc);
