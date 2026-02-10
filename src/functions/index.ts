import preToken from './sign-in-trigger';
import user from './users';
import {createClient, deleteClient, listClients, createClientCredentials, deleteClientCredentials, appToken} from './apps';
import {refreshToAuth, authToken} from './authorize';
import {profileCacheAgent, tokenCacheAgent, userSyncAgent} from './sign-in-subscriptions';
import {oidc, jwks} from './public';
import me from './me';
import guard from './authGuard';

const functions = {
  preToken,
  user,
  refreshToAuth,
  authToken,
  profileCacheAgent,
  tokenCacheAgent,
  userSyncAgent,
  oidc,
  jwks,
  me,
  guard,
  createClient,
  deleteClient,
  listClients,
  createClientCredentials,
  deleteClientCredentials,
  appToken,
};

export default functions;
