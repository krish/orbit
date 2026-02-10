/*
@author: Krishantha Dinesh - krishanthad@fortude.co
@project: RAPID orbit
These method is designed to sign and verify orbit tokens
*/
import * as AWS from 'aws-sdk';
import base64url from 'base64url';
import {Claim, TokenVerifyResult} from './cognito-token-manager';
import * as pem2jwk from 'pem-jwk';
import {logger} from './logger-service';
const kms = new AWS.KMS();
const kmsKeyAlias = process.env.ORBIT_SIGN_KEY_ALIAS;
let baseURL: string;
if (process.env.STAGE == 'prod') {
  baseURL = process.env.BASE_URL_PROD;
} else {
  baseURL = process.env.BASE_URL;
}

const iss: string = baseURL;
const orbitIssuer: string = baseURL;

interface jwk {
  kty: string;
  n: string;
  e: string;
}

/* This is the payload of the JWT token. */
interface Payload {
  iat: number;
  exp: number;
  iss: string;
  token_use: TOKEN_TYPE;
  client_id: string;
  username: string;
  data: {} | string;
}
/* This is the interface for the payload of the JWT token. */
/* interface Claim {
  iat: number;
  iss: string;
  exp: number;
  token_use: string;
  data: RefreshTokenData;
} */
/* This is the interface for the payload of the JWT token. */
export interface RefreshTokenData {
  username: string;
  userId: string;
  clientId: string;
  token_use: string;
}
export const ORBIT_keyAlgorithm: string = 'RS512';
export const ORBIT_keyId: string = 'KHdmBY8191M84D1221PxMlRd';
/* This is the header of the JWT token. */
const header = {
  kid: ORBIT_keyId,
  alg: ORBIT_keyAlgorithm,
  typ: 'JWT',
};
/* Defining a type called TOKEN_TYPE. It has two values, ACCESS_TOKEN and REFRESH_TOKEN. */
enum TOKEN_TYPE {
  ACCESS_TOKEN = 'access',
  REFRESH_TOKEN = 'refresh',
}
//to make sure expire times are configured
if (
  !process.env.ORBIT_ACCESSTOKEN_VALIDITY_HOURS ||
  !process.env.ORBIT_REFRESHTOKEN_VALIDITY_HOURS ||
  !(+process.env.ORBIT_ACCESSTOKEN_VALIDITY_HOURS > 0) ||
  !(+process.env.ORBIT_REFRESHTOKEN_VALIDITY_HOURS > 0)
) {
  logger.debug('access token validity period', process.env.ORBIT_ACCESSTOKEN_VALIDITY_HOURS);
  logger.debug('refresh token validity period', process.env.ORBIT_REFRESHTOKEN_VALIDITY_HOURS);
  throw new Error('acesstoken and/or refresh token validity period not configured');
}
export const accessTokenValidityHours: number = +process.env.ORBIT_ACCESSTOKEN_VALIDITY_HOURS;
export const refreshTokenValidityHours: number = +process.env.ORBIT_REFRESHTOKEN_VALIDITY_HOURS;
/**
 * It takes a message and a token type, and returns a signed JWT token
 * @param {{} | string} message - the payload of the JWT token.
 * @param {TOKEN_TYPE} tokenType - This is the type of token you're signing. It can be either access or
 * refresh.
 * @returns A JWT token
 */
const sign = async (message: {} | string, tokenType: TOKEN_TYPE, client_id: string, username: string): Promise<string> => {
  logger.debug('payload for sign', message);
  const iat: number = Math.floor(Date.now() / 1000);
  let exp: number;
  if (tokenType === TOKEN_TYPE.ACCESS_TOKEN) {
    exp = iat + accessTokenValidityHours * (60 * 60);
    logger.debug('token type is access. expire set to:', exp);
  } else if (tokenType === TOKEN_TYPE.REFRESH_TOKEN) {
    exp = iat + refreshTokenValidityHours * (60 * 60);
    logger.debug('token type is refresh. expire set to:', exp);
  } else {
    throw new Error('unknown token type. allowed values are access|refresh');
  }

  //const payload: Payload = {iat, exp, data: message, iss};
  const payload: Payload = {
    iat,
    exp,
    iss,
    token_use: tokenType,
    client_id,
    username,
    data: message,
  };

  const encHeader = base64url(JSON.stringify(header));
  const encPayload = base64url(JSON.stringify(payload));
  const payloadToSign = Buffer.from(encHeader + '.' + encPayload);

  const sign = await kms
    .sign({
      Message: payloadToSign,
      KeyId: kmsKeyAlias,
      SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_512',
      MessageType: 'RAW',
    })
    .promise()
    .catch((e) => {
      logger.error('error on sign JWT token', e);
      throw new Error(e);
    });

  const signature = sign.Signature.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return encHeader + '.' + encPayload + '.' + signature;
};
/**
 * It gets the public key from the KMS key alias
 * @returns The public key of the KMS key.
 */
const getorbitPublickey = async (inclueHeaderFooter: boolean): Promise<string> => {
  const key = await kms.getPublicKey({KeyId: kmsKeyAlias}).promise();
  let publicKey: string;
  if (inclueHeaderFooter) {
    publicKey = `-----BEGIN PUBLIC KEY-----\n${key.PublicKey.toString('base64')}\n-----END PUBLIC KEY-----`;
  } else {
    publicKey = key.PublicKey.toString('base64');
  }
  return publicKey;
};

const getJWK = async (): Promise<jwk> => {
  const publicKey = await getorbitPublickey(true);
  return pem2jwk.pem2jwk(publicKey);
};

/**
 * It takes a token and a type, and returns a token result
 * @param {string} token - The token to be verified.
 * @param {'access' | 'refresh'} type - This is the type of the token. It can be either access or
 * refresh.
 * @returns a promise that resolves to a TokenVerifyResult object.
 */
const verify = async (token: string, type: 'access' | 'refresh') => {
  const [header, payload, signature] = (token || '').split('.');

  if (!header || !payload || !signature) {
    throw new Error('invalid JWT token');
  }

  const message = `${header}.${payload}`;

  /* Verifying the signature of the token. */
  const result: AWS.KMS.VerifyResponse = await kms
    .verify({
      KeyId: kmsKeyAlias,
      Message: message,
      MessageType: 'RAW',
      Signature: Buffer.from(signature, 'base64'),
      SigningAlgorithm: 'RSASSA_PKCS1_V1_5_SHA_512',
    })
    .promise();
  if (!result.SignatureValid) {
    throw new Error('Signature verification fail. token might be tampered');
  }

  const claim: Claim = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8') || '{}') as Claim;

  logger.info('verify claim is:=>', claim);

  /* This is to check if the token is expired. */
  const currentTime = Math.floor(new Date().valueOf() / 1000);
  if (!claim.exp || currentTime > claim.exp || currentTime < claim.iat) {
    throw new Error('this token is invalid or expired');
  }
  if (!claim.iss || claim.iss !== orbitIssuer) {
    logger.info(`${claim.iss} - ${orbitIssuer}`);
    throw new Error('this token is invalid as issuer is unknown');
  }

  /* This is to check the token type. If the token type is refresh, it checks if the token_use is
refresh. If the token type is access, it checks if the token_use is access. */
  if (type === 'refresh') {
    if (!claim.token_use || claim.token_use !== 'refresh') {
      throw new Error('invalid token type. please use refresh token');
    }
  } else {
    //since only allow these two types it is safe to use else
    if (!claim.token_use || claim.token_use !== 'access') {
      throw new Error('invalid token type. please use access token');
    }
  }

  const tokenResult: TokenVerifyResult = {
    username: claim.username,
    clientId: claim.client_id,
    isValid: true,
    expiredUtc: new Date(claim.exp * 1000),
  };
  return tokenResult;
};

export {sign, verify, TOKEN_TYPE, getorbitPublickey as getPublickey, getJWK};
