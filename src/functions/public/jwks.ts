import {getJWK, ORBIT_keyAlgorithm, ORBIT_keyId} from '@libs/orbit-token-manager';
import {middyfy} from '@libs/lambda';
import {logger} from '@libs/logger-service';
import {successResponse} from '@libs/responses';
/*
 * this format is alligned with rfc7517 JKS format
 * https://datatracker.ietf.org/doc/html/rfc7517
 */
interface Keyinfo {
  alg: string;
  e?: string;
  kid: string;
  kty: string;
  key_ops: string[]; //verify
  n: string;
  use: string;
}
interface KeyResponse {
  keys: Keyinfo[];
}
const jks = async (event) => {
  const {kty, n, e} = await getJWK().catch((e) => {
    logger.error('error on getting jwk', e);
    throw new Error('Error on getting JWK. please refer logs');
  });

  const response: KeyResponse = {
    keys: [
      {
        alg: ORBIT_keyAlgorithm,
        kid: ORBIT_keyId,
        kty,
        key_ops: ['verify'],
        n,
        e,
        use: 'sig',
      },
    ],
  };
  return successResponse(response);
};

export const main = middyfy(jks);
