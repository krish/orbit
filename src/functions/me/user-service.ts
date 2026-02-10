import {getDatabaseConnection} from '@libs/database-manager';
import {BuyerDivision, Facility, ProcurementGroup, Profile, Role, Warehouse} from '../../types/main.types';

import {BuyerDivisionEntity, CognitoUser, DivisionEntity, FacilityEntity, ProcGroup, RoleEntity, SbuEntity, User} from '../../entities/main.entities';

import {SbuWarehouseMapper, UserBuyerDivisionMapper, UserProcGropMapper, UserRoleMapper, UserWarehouseMapper} from '../../entities/mapper.entity';
import Redis from 'ioredis';
import {getRedisConnection} from '@libs/cache-manager';
import {logger} from '@libs/logger-service';

/**
 * It fetches a user from the database and returns a profile object
 * @param {string} username - string
 * @returns A promise that resolves to a Profile object.
 */
const getUser = async (username: string): Promise<Profile> => {
  const user: User = await (
    await getDatabaseConnection()
  )
    .createQueryBuilder(User, 'user')
    .andWhere('user.userName = :userName', {userName: username})
    .getOne()
    .catch((e) => {
      logger.error(e, 'Error on fecthing user');
      throw new Error(e);
    });
  if (!user) {
    throw new Error('invalid username');
  }
  const profile: Profile = {
    username: user.username,
    fullName: user.full_name,
    isActive: user.active,
    company: user.company,
  };
  return profile;
};

const findCognitoUser = async (username: string): Promise<CognitoUser> => {
  const cognitoUser: CognitoUser = await (
    await getDatabaseConnection()
  )
    .createQueryBuilder(CognitoUser, 'cognitoUser')
    .andWhere('LOWER(cognitoUser.userName) = LOWER(:userName)', {userName: username})
    .getOne()
    .catch((e) => {
      logger.error(e, 'Error on fecthing user');
      throw new Error(e);
    });
  return cognitoUser;
};

const saveCognitoUser = async (username: string, cognitoId: string, name: string): Promise<CognitoUser> => {
  let entity = {
    userName: username,
    cognitoId: cognitoId,
    name: name,
  };
  const cognitoUser: CognitoUser = await (await getDatabaseConnection()).save(CognitoUser, entity).catch((e) => {
    logger.error(e, 'Error on saving cognito user');
    throw new Error(e);
  });
  if (!cognitoUser) {
    throw new Error('invalid username');
  }
  return cognitoUser;
};

const updateCognitoUser = async (userName: string, cognitoId: string, name: string): Promise<CognitoUser> => {
  /* Check the user existance again ignore of case sensitivity */
  const existingUser: CognitoUser = await (
    await getDatabaseConnection()
  )
    .createQueryBuilder(CognitoUser, 'cognitoUser')
    .andWhere('LOWER(cognitoUser.userName) = LOWER(:userName)', {userName: userName})
    .getOne()
    .catch((e) => {
      logger.error(e, 'Error on fecthing user');
      throw new Error(e);
    });

  if (!existingUser) {
    throw new Error('invalid username');
  }

  existingUser.cognitoId = cognitoId; /* update congitoId as its generated for first time from Cognito */
  existingUser.name = name; /* update name as name can be different from what is given by data team than AD */
  existingUser.userName = userName; /* update email incase email is case sensitivity is diffrent from AD */

  /* save updated user back into databse */
  const cognitoUser: CognitoUser = await (await getDatabaseConnection()).save(existingUser).catch((e) => {
    logger.error(e, 'Error on saving cognito user');
    throw new Error(e);
  });

  return cognitoUser;
};

const cacheUserProfile = async (username: string, ttl: number): Promise<Profile> => {
  const user = await getUserProfile(username).catch((e) => {
    logger.error('there was an error when fetching user profile to cache', e);
    throw new Error('there was an error when fetching user profile to cache. check logs for more details');
  });

  const redis: Redis = await getRedisConnection().catch((e) => {
    logger.error(e);
    return null;
  });

  /* This is a function that will cache the user profile for 1 day. */
  const cached_a = await redis.set(`codelabs:orbit:user:${username}:profile`, JSON.stringify(user), 'EX', ttl);
  logger.info(`user ${username} profile cached with response`, cached_a);
  return user;
};

const findUserOrSave = async (username: string, cognitoId: string, name: string): Promise<CognitoUser> => {
  const cognitoUser = await findCognitoUser(username).catch((e) => {
    logger.error(e, 'there was an error when fetching cognito user');
    throw new Error('there was an error when fetching cognito. check logs for more details');
  });

  /* If user exist no need to save user, return null. */
  if (cognitoUser) {
    /* If user cognitoId and username are same such user is just copied into table in advance, manually, for data migration activitiy */
    if (cognitoUser.cognitoId == cognitoUser.userName) {
      let updatedUser = updateCognitoUser(username, cognitoId, name);
      logger.info(`user ${username} with ${cognitoId} updated in database`);
      return updatedUser;
    } else return cognitoUser;
  }

  /* If not exist save user. */
  let newCognitoUser = saveCognitoUser(username, cognitoId, name);
  logger.info(`user ${username} with ${cognitoId} saved in database`);

  return newCognitoUser;
};

/**
 * It fetches the roles of a user from the database
 * @param {string} username - string - The username of the user whose roles we want to fetch.
 * @returns An array of Role objects
 */
const getRoles = async (username: string): Promise<Role[]> => {
  const roles: RoleEntity[] = await (
    await getDatabaseConnection()
  )
    .createQueryBuilder(RoleEntity, 'role')
    .innerJoin(UserRoleMapper, 'ur', 'role.id = ur.roleId')
    .andWhere('ur.userName = :userName', {userName: username})
    .getMany()
    .catch((e) => {
      logger.error('Error on fecthing roles', e);
      throw new Error(e);
    });
  if (roles) {
    const userRoles: Role[] = roles.map((role) => {
      return {id: role.id, code: role.code, name: role.name} as Role;
    });
    return userRoles;
  }
  return [];
};

/**
 * It fetches procurement groups assigned to a user
 * @param {string} username - string,
 * @param {number} company - number
 * @returns An array of ProcurementGroup objects
 */
const getProcurementGroups = async (username: string, company: number): Promise<ProcurementGroup[]> => {
  const procurementGroups = await (
    await getDatabaseConnection()
  )
    .createQueryBuilder(UserProcGropMapper, 'user2Proc')
    .innerJoin(ProcGroup, 'pgm', 'user2Proc.code = pgm.code')
    .andWhere('user2Proc.userName = :userName', {
      userName: username,
    })
    .andWhere('user2Proc.cono = :cono', {cono: company})
    .select(['user2Proc.code', 'user2Proc.cono', 'user2Proc.id', 'user2Proc.userName'])
    .addSelect(['pgm.description', 'pgm.name'])
    .distinctOn(['user2Proc.code'])
    .getRawMany()
    .catch((e) => {
      logger.error('Error on fecthing procurement groups', e);
      throw new Error(e);
    });
  if (procurementGroups.length) {
    const procGroups: ProcurementGroup[] = procurementGroups.map((p) => {
      return {
        id: p.user2Proc_id,
        code: p.user2Proc_code,
        name: p.pgm_name,
        description: p.pgm_description,
      } as ProcurementGroup;
    });

    return procGroups;
  }
  logger.trace('No any procurement groups assigned to user');
  return [];
};

/**
 * It fetches the buyer divisions assigned to a user from the database
 * @param {string} username - string, company: number
 * @param {number} company - number
 * @returns An array of BuyerDivision objects
 */
const getBuyerDivisions = async (username: string, company: number) => {
  const bdivisions = await (
    await getDatabaseConnection()
  )
    .createQueryBuilder(UserBuyerDivisionMapper, 'user2Bd')
    .innerJoin(BuyerDivisionEntity, 'bydm', 'user2Bd.code = bydm.code')
    .andWhere('user2Bd.userName = :userName', {
      userName: username,
    })
    .andWhere('user2Bd.cono = :cono', {cono: company})
    .select(['user2Bd.code', 'user2Bd.cono', 'user2Bd.id', 'user2Bd.userName'])
    .addSelect(['bydm.description', 'bydm.name'])
    .distinctOn(['user2Bd.code'])
    .getRawMany()
    .catch((e) => {
      logger.error('Error on fecthing BuyerDivisions', e);
      throw new Error(e);
    });
  if (bdivisions.length) {
    const buyerDivisions: BuyerDivision[] = bdivisions.map((b) => {
      return {
        id: b.user2Bd_id,
        code: b.user2Bd_code,
        name: b.bydm_name,
        description: b.bydm_description,
      } as BuyerDivision;
    });
    return buyerDivisions;
  } else {
    logger.trace('No any Buyer Divisions  assigned to user');
    return [];
  }
};

/**
 * It fetches all the warehouses assigned to a user
 * @param {string} username - string,
 * @param {number} company - number
 * @returns An array of warehouses
 */
const getWarehouses = async (username: string, company: number) => {
  const wh = await (
    await getDatabaseConnection()
  )
    .createQueryBuilder(UserWarehouseMapper, 'usr2wh')
    .innerJoin(SbuWarehouseMapper, 'wh', 'usr2wh.whId = wh.id')
    .innerJoin(SbuEntity, 's', 'wh.sbuId = s.id')
    .innerJoin(FacilityEntity, 'f', 'wh.facility = f.code')
    .innerJoin(DivisionEntity, 'dm', 'wh.division = dm.code')
    .where('usr2wh.userName = :userName', {userName: username})
    .andWhere('wh.cono = :cono', {cono: company})
    .select(['usr2wh.id', 'usr2wh.userName', 'usr2wh.isReadOnly'])
    .addSelect(['wh.name', 'wh.code'])
    .addSelect(['s.cono', 's.code', 's.name', 's.id'])
    .addSelect(['s.name', 's.code'])
    .addSelect(['f.code', 'f.name'])
    .addSelect(['dm.code', 'dm.name'])
    .distinctOn(['wh.id'])
    .getRawMany()
    .catch((e) => {
      logger.error('Error on fecthing warehouses', e);
      throw new Error(e);
    });

  if (wh.length) {
    const warehouses = wh.map((w) => {
      return {
        id: w.usr2wh_id,
        name: w.wh_name,
        code: w.wh_code,
        facilityCode: w.f_code,
        facilityName: w.f_name,
        divisionCode: w.dm_code,
        divisionName: w.dm_name,
        sbuCode: w.s_code,
        sbuName: w.s_name,
      } as Warehouse;
    });
    return warehouses;
  } else {
    logger.trace('No any warehouses assigned to user');
    return [];
  }
};

const getFacility = async (username: string, company: number) => {
  const facis = await (
    await getDatabaseConnection()
  )
    .createQueryBuilder(SbuWarehouseMapper, 'wh')
    .innerJoin(UserWarehouseMapper, 'uwm', 'wh.id = uwm.whId')
    .innerJoin(FacilityEntity, 'fm', 'wh.facility = fm.code and wh.cono = fm.cono')
    .andWhere('uwm.userName = :userName', {userName: username})
    .andWhere('wh.cono = :cono', {cono: company})
    .select(['wh.cono', 'fm.code', 'fm.name'])
    .distinctOn(['wh.cono', 'fm.code', 'fm.name'])
    .getRawMany()
    .catch((e) => {
      logger.error('Error on fecthing Facilities', e);
      throw new Error(e);
    });

  if (facis.length) {
    const facilities: Facility[] = (await facis).map((f) => {
      return {
        code: f.fm_code,
        name: f.fm_name,
      } as Facility;
    });
    return facilities;
  } else {
    logger.trace('No any facilities assigned to user');
    return [];
  }
};

/**
 * "Get the user profile, roles, procurement groups, buyer divisions, and warehouses for the given
 * username."
 *
 * The function is a bit long, but it's easy to read and understand
 * @param {string} username - string - The username of the user you want to get the profile for.
 * @returns A promise that resolves to a Profile object.
 */
const getUserProfile = async (username: string): Promise<Profile> => {
  const profile: Profile = await getUser(username);

  /* It's fetching all the procurement groups assigned to a user. */
  const procurementGroups: ProcurementGroup[] = await getProcurementGroups(username, profile.company).catch((e) => {
    logger.error('fetching procurementGroups results with error', e);
    return [];
  });
  /* It's fetching all the buyer divisions assigned to a user. */
  const buyerDivisions: BuyerDivision[] = await getBuyerDivisions(username, profile.company).catch((e) => {
    logger.error('fetching BuyerDivision results with error', e);
    return [];
  });

  /* Fetching all the warehouses assigned to a user. */
  const warehouses: Warehouse[] = await getWarehouses(username, profile.company).catch((e) => {
    logger.error('fetching warehouses results with error', e);
    return [];
  });

  /* It's fetching all the facilities assigned to a user. */
  const faci: Facility[] = await getFacility(username, profile.company).catch((e) => {
    logger.error('fetching facilities results with error', e);
    return [];
  });

  profile.procurementGroups = procurementGroups;
  profile.buyerDivisions = buyerDivisions;
  profile.warehouses = warehouses;
  profile.facilities = faci;
  return profile;
};

export {getUserProfile, cacheUserProfile, findUserOrSave};
