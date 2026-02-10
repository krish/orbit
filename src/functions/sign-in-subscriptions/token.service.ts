import {getDatabaseConnection} from '@libs/database-manager';

import {RefreshTokenData, sign, TOKEN_TYPE} from '@libs/orbit-token-manager';
import {logger} from '@libs/logger-service';
import {Application, ApplicationScope, Permission, RoleEntity, User} from 'src/entities/main.entities';
import {AppScopeMapper, RoleFunctionMapper, UserFunctionMapper, UserRoleMapper} from 'src/entities/mapper.entity';
export interface AccessTokenMessage {
  applicationScopes: ApplicationScope[];
  user: User;
  permissions: string[];
  error: string[];
}
/**
 * It returns a list of permissions for a given user and clientId
 * @param {string} userName - The username of the user you want to get the permissions for.
 * @param {string} clientId - The client ID of the Cognito User Pool.
 * @returns An array of Permission objects
 */
const getUserPermissions = async (userName: string, clientId: string): Promise<Permission[]> => {
  // We check to see if the user is an Iromhide App client
  // If it is an app client, we do not consider the CognitoClientID in the WHERE clause.
  const isApplicationClient = await (await getDatabaseConnection())
    .createQueryBuilder(Application, 'application')
    .select()
    .where('application.name = :userName', {userName: userName})
    .getOne();
  let userPermissionsQueryBuilder = (await getDatabaseConnection())
    .createQueryBuilder(Permission, 'permission')
    .select()
    .innerJoin(UserFunctionMapper, 'uf', 'permission.funcId = uf.id')
    .innerJoin(Application, 'app', 'permission.appId = app.id')
    .innerJoin(RoleFunctionMapper, 'rf', 'uf.id = rf.funcId')
    .innerJoin(RoleEntity, 'r', 'rf.roleId = r.id')
    .innerJoin(UserRoleMapper, 'ur', 'r.id = ur.roleId')
    .innerJoin(User, 'u', 'u.userName = ur.userName')
    .andWhere('r.cono = u.conoDefault')
    .andWhere('ur.userName = :userName', {userName: userName});

  if (!isApplicationClient) {
    userPermissionsQueryBuilder.andWhere('app.cognitoClientId=:clientId', {clientId: clientId});
  }

  const permissions: Permission[] = await userPermissionsQueryBuilder.getMany();
  return permissions;

  //return await (await getDatabaseConnection()).find(Application);
};
/**
 * "Get a user from the database by their userName."
 *
 * The function is async, so it returns a promise. The promise resolves to a User object
 * @param {string} userName - string
 * @returns A promise that resolves to a User object.
 */
const getUser = async (username: string): Promise<User> => {
  const user = await (
    await getDatabaseConnection()
  ).findOneBy(User, {
    username: username,
  });
  return user;
};
/**
 * Get all the application scopes for a given application
 * @param {string} clientId - The client ID of the application that you want to get the scopes for.
 * @returns An array of ApplicationScope objects
 */
const getApplicationScopes = async (clientId: string): Promise<ApplicationScope[]> => {
  const appPermissions: ApplicationScope[] = await (
    await getDatabaseConnection()
  )
    .createQueryBuilder(ApplicationScope, 'appScopes')
    .select()
    .innerJoin(AppScopeMapper, 'asm', 'appScopes.id = asm.scopeId')
    .innerJoin(Application, 'a', 'asm.appId = a.id')
    .andWhere('a.cognitoClientId = :cognitoClientId', {
      cognitoClientId: clientId,
    })
    .getMany();
  return appPermissions;
};

/**
 * It fetches the user, the user's permissions, and the application scopes, and returns an object with
 * all of that information
 * @param {string} email - the email of the user
 * @param {string} clientId - The clientId of the application that is requesting the access token.
 * @returns An object with the following properties:
 * - applicationScopes: An array of ApplicationScope objects
 * - user: A User object
 * - permissions: An array of strings
 * - token_use: A string
 * - error: An array of strings
 */
const getAccessTokenPayload = async (email: string, clientId: string): Promise<AccessTokenMessage> => {
  const error: string[] = [];
  //get user details
  const user: User = await getUser(email).catch((e) => {
    logger.error(e, 'error on fetching user');
    error.push('error on fetching user');
    return null;
  });
  if (!user) {
    throw new Error('cannot find user or Error on fectching user. please refer logs');
  }
  if (!user.active) {
    throw new Error('user is not active. cannot issue a token');
  }
  //get userPermissions
  const permissions = (
    await getUserPermissions(email, clientId).catch((e) => {
      logger.info('error on fetching permissions', e);
      error.push('error on fetching permissions');
      return [];
    })
  ).map((p: Permission) => p.code);

  const applicationScopes: ApplicationScope[] = await getApplicationScopes(clientId).catch((e) => {
    logger.error('error on fetching application scopes', e);
    error.push('error on fetching application scopes');
    return [];
  });
  const accessPayload: AccessTokenMessage = {
    applicationScopes,
    user,
    permissions,
    error,
  };
  return accessPayload;
};

/**
 * It will get the access token payload and sign it
 * @param {string} email - This is the email of the user.
 * @param {string} clientId - This is the client id of the client that is requesting the access token.
 * @returns A string
 */
const getAccessToken = async (email: string, clientId: string): Promise<string> => {
  /* This is a function that will get the access token payload. */
  const accessTokenPayload: AccessTokenMessage = await getAccessTokenPayload(email, clientId).catch((e) => {
    logger.error(e, 'error on getting accessToken payload');
    return null;
  });
  if (!accessTokenPayload) {
    logger.error('since access token payload generation errored pricess abort');
    throw new Error('Error on creating access token. please refer log for more information');
  }
  /* This is a function that will get the access token payload. */
  const accessToken: string = await sign(accessTokenPayload, TOKEN_TYPE.ACCESS_TOKEN, clientId, email).catch((e) => {
    logger.error('error on signing payload', e);
    return null;
  });
  if (!accessToken) {
    throw new Error('Error on creating access token. please refer log for more information');
  } else {
    return accessToken;
  }
};

/**
 * It takes an email and clientId as input and returns a refresh token
 * @param {string} email - The email of the user.
 * @param {string} clientId - This is the client ID of the application that is requesting the token.
 * @returns A string
 */
const getRefreshToken = async (email: string, clientId: string) => {
  //check user is still valid
  logger.debug(`fetching user records for ${email} and clientId: ${clientId}`);
  const user: User = await getUser(email).catch((e) => {
    logger.error('error on fetching user', e);
    return null;
  });
  if (!user) {
    throw new Error('cannot find user or Erro on fectching user. please refer logs');
  }
  if (!user.active) {
    throw new Error('user is not active. cannot issue a token');
  }

  /* This is the payload for refresh token. */
  const refreshPayload: RefreshTokenData = {
    username: user.username,
    clientId,
    userId: user.userId,
    token_use: 'refresh',
  };

  /* This is a function that will get the refresh token payload signed */
  const refereshToken: string = await sign(refreshPayload, TOKEN_TYPE.REFRESH_TOKEN, clientId, user.username).catch((e) => {
    logger.error('error on signing payload', e);
    return null;
  });
  if (!refereshToken) {
    throw new Error('Error on creating referesh token . please refer log for more information');
  } else {
    return refereshToken;
  }
};

export {getUserPermissions, getApplicationScopes, getUser, getAccessToken, getRefreshToken};
