/*
@author: Krishantha Dinesh - krishanthad@fortude.co
@project: RAPID orbit
*/

import axios from 'axios';
import Redis from 'ioredis';
import * as jsonwebtoken from 'jsonwebtoken';
import {getRedisConnection} from './cache-manager';
import {logger} from './logger-service';

const COGNITO_PUBLICKEYS_CACHEKEY = 'codelabs:orbit:cognitoPubKeys';
const orbit_PUBLICKEYS_CACHEKEY = 'codelabs:orbit:orbitPubKeys';
const jwkToPem = require('jwk-to-pem');

export interface VerifyRequest {
  readonly token?: string;
}

export interface TokenVerifyResult {
  readonly username: string;
  readonly userId?: string;
  readonly clientId: string;
  readonly isValid: boolean;
  readonly expiredUtc: Date;
  readonly error?: any;
}

interface TokenHeader {
  kid: string;
  alg: string;
}
interface PublicKey {
  alg: string;
  e: string;
  kid: string;
  kty: string;
  n: string;
  use: string;
}
interface PublicKeyMeta {
  jwk: PublicKey;
  pem: string;
}

interface PublicKeys {
  keys: PublicKey[];
}

interface PublicKeyMap {
  [key: string]: PublicKeyMeta;
}

export interface Claim {
  token_use: string;
  auth_time: number;
  iss: string;
  iat: number;
  exp: number;
  email: string;
  username: string;
  aud: string;
  client_id: string;
  identities: string[];
}
const userPoolId = process.env.USERPOOL_ID;
if (!userPoolId) {
  logger.error('userpoolid is required as env variable');
  throw new Error('required configuration parameter(s) missing. please contact administrator');
}
const issuer: string = `https://cognito-idp.ap-southeast-1.amazonaws.com/${userPoolId}`;

const getPublicKeys = async (): Promise<PublicKeyMap> => {
  const redis: Redis = await getRedisConnection().catch((e) => {
    logger.error(e);
    return null;
  });

  let cachedKeys: PublicKeyMap = JSON.parse(await redis.get(COGNITO_PUBLICKEYS_CACHEKEY));
  if (cachedKeys) {
    logger.info('cached public key found.');
    return cachedKeys;
  }
  logger.info('cached public key not found.');
  const keyUrl = `${issuer}/.well-known/jwks.json`;
  const publicKeys = await axios.get<PublicKeys>(keyUrl);

  cachedKeys = publicKeys.data.keys.reduce((map, jwk) => {
    const pem = jwkToPem(jwk);
    map[jwk.kid] = {jwk, pem};
    return map;
  }, {} as PublicKeyMap);

  await redis.set(COGNITO_PUBLICKEYS_CACHEKEY, JSON.stringify(cachedKeys), 'EX', 3600);
  return cachedKeys;
};

const validateIdToken = async (jwtToken: string): Promise<TokenVerifyResult> => {
  //split like this as only header is required
  const tokenParts = (jwtToken || '').split('.');
  if (tokenParts.length < 2) {
    throw new Error('invalid JWT token');
  }
  const tokenHeader: TokenHeader = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString('utf-8'));

  const keys = await getPublicKeys();
  const key = keys[tokenHeader.kid];

  if (!key) {
    throw new Error('Token signed with unknown kid');
  }

  const claim = jsonwebtoken.verify(jwtToken, key.pem) as Claim;
  //username is same as email and username prop not available in id token
  claim.username = claim.email;
  const currentTime = Math.floor(new Date().valueOf() / 1000);

  //check if it is correct issuer
  if (!claim.iss || claim.iss !== issuer) {
    throw new Error('this token is invalid as issuer is unknown');
  }

  //check expired tokens
  if (!claim.exp || currentTime > claim.exp || currentTime < claim.auth_time) {
    throw new Error('this token is invalid or expired');
  }
  if (!claim.token_use || claim.token_use !== 'id') {
    throw new Error('invalid token type. please use id token');
  }

  let result: TokenVerifyResult = {
    username: claim.email,
    userId: claim.identities ? claim.identities[0]['userId'] : claim['cognito:username'],
    clientId: claim.aud,
    expiredUtc: new Date(claim.exp * 1000),
    isValid: true,
  };
  return result;
};

export {validateIdToken};
