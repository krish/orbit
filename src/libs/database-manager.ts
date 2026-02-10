import {
  Application,
  ApplicationScope,
  BuyerDivisionEntity,
  CognitoUser,
  DivisionEntity,
  FacilityEntity,
  Permission,
  ProcGroup,
  RoleEntity,
  SbuEntity,
  User,
} from '../entities/main.entities';

import {
  AppScopeMapper,
  RoleFunctionMapper,
  SbuWarehouseMapper,
  UserBuyerDivisionMapper,
  UserFunctionMapper,
  UserProcGropMapper,
  UserRoleMapper,
  UserWarehouseMapper,
} from '../entities/mapper.entity';

import {DataSource, EntityManager} from 'typeorm';
import {logger} from './logger-service';

let datasource: DataSource;

const isConnectionExsist = () => {
  return datasource ? datasource?.isInitialized : false;
};

const getDatabaseConnection = async (): Promise<EntityManager> => {
  if (datasource && datasource?.isInitialized) {
    //this mean we already have a connection.
    logger.info('connection already available. using exsisting connection');
    return datasource.manager;
  } else {
    logger.info('connection NOT available. trying to create new connection');
    datasource = new DataSource({
      applicationName: 'codelabs-auth',
      type: 'postgres',
      host: process.env.postgresdb_hostname,
      port: +process.env.POSTGRES_PORT,
      username: process.env.POSTGRES_USERNAME,
      password: process.env.postgresdb_password, //process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DATABASE,
      schema: process.env.POSTGRES_SCHEMA,
      connectTimeoutMS: +process.env.POSTGRES_CONNECTION_TIMEOUT,
      synchronize: false,
      logging: false,
      useUTC: true,
      entities: [
        User,
        Application,
        RoleEntity,
        RoleFunctionMapper,
        Permission,
        UserFunctionMapper,
        UserRoleMapper,
        ApplicationScope,
        AppScopeMapper,
        ProcGroup,
        UserProcGropMapper,
        BuyerDivisionEntity,
        UserBuyerDivisionMapper,
        UserWarehouseMapper,
        SbuWarehouseMapper,
        SbuEntity,
        FacilityEntity,
        DivisionEntity,
        CognitoUser,
      ],
      migrations: [],
      subscribers: [],
    });

    return await datasource
      .initialize()
      .then(() => {
        logger.info('new connection to database established successfully');
        return datasource.manager;
      })
      .catch((err) => {
        logger.info(err, `error on connection create to database ${process.env.postgresdb_hostname}`);
        throw new Error('Error on Database connectivity. please refer logs');
      });
  }
};
export {getDatabaseConnection, isConnectionExsist};
