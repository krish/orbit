import {Column, Entity, PrimaryColumn, PrimaryGeneratedColumn} from 'typeorm';
@Entity('applicationscope')
/* The `ApplicationScope` class is a TypeScript class that represents a row in the `application_scope`
table */
class ApplicationScope {
  @Column({type: String})
  scope: string;

  @Column({type: String, name: 'desc'})
  description: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;
}

@Entity('sbu')
/* The `SbuEntity` class is a TypeScript class that is decorated with `@Entity` and `@Table`
decorators. The `@Entity` decorator tells TypeORM that this class is an entity that should be stored
in the database. The `@Table` decorator tells TypeORM that this class is stored in the `sbu` table */
class SbuEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({name: 'cono', type: Number})
  cono: number;

  @Column({name: 'code', type: String})
  code: string;

  @Column({name: 'name', type: String})
  name: string;

  @Column({name: 'status', type: Boolean})
  status: boolean;

  @Column({name: 'createdBy', type: String})
  createdBy: string;

  @Column({name: 'updatedBy', type: String})
  updatedBy: string;

  @Column({name: 'createdAt', type: Date})
  createdAt: Date;

  @Column({name: 'updatedAt', type: Date})
  updatedAt: Date;
}

@Entity('user')
class User {
  @PrimaryColumn({type: String, name: 'userName'})
  username: string;

  @Column({type: String, name: 'name'})
  full_name: string;

  @Column({type: Boolean, name: 'status'})
  active: boolean;

  @Column({type: Number, name: 'conoDefault'})
  company: number;

  @Column({type: String, name: 'm3user'})
  m3userId: string;

  @Column({type: String})
  userId: string;

  @Column({type: Date})
  createdAt: Date;

  @Column({type: Date, name: 'updatedAt'})
  last_updatedAt: Date;
}

@Entity('cognitoUser')
class CognitoUser {
  @Column({type: String, name: 'cognitoId'})
  cognitoId: string;

  @PrimaryColumn({type: String, name: 'userName'})
  userName: string;

  @Column({type: String, name: 'name'})
  name: string;
}

@Entity('application')
class Application {
  @Column({type: String})
  name: string;

  @Column({type: String})
  isActive: boolean;

  @Column({type: String})
  createdBy: string;

  @Column({type: Date})
  createdAt: Date;

  @Column({type: String})
  cognitoClientId: string;

  @PrimaryColumn({type: String})
  id: string;
}
@Entity('buyerdivision')
class BuyerDivisionEntity {
  @PrimaryColumn({type: String})
  code: string;

  @PrimaryColumn({type: Number})
  cono: number;

  @Column({type: String})
  name: string;

  @Column({type: String})
  description: string;
}
@Entity('division')
class DivisionEntity {
  @PrimaryColumn({type: String})
  code: string;

  @PrimaryColumn({type: Number})
  cono: number;

  @Column({type: String})
  name: string;

  @Column({type: String})
  description: string;
}

@Entity('facility')
class FacilityEntity {
  @PrimaryColumn({type: String})
  code: string;

  @PrimaryColumn({type: Number})
  cono: number;

  @Column({type: String})
  name: string;

  @Column({type: String})
  description: string;
}
@Entity('permission')
class Permission {
  @Column({type: String})
  code: string;

  @Column({type: String})
  name: string;

  @Column({type: String})
  createdBy: string;

  @Column({type: Date})
  createdAt: Date;

  @PrimaryGeneratedColumn()
  id: string;

  @Column({type: String})
  funcId: string;

  @Column({type: String})
  appId: string;
}
@Entity('procurementgroup')
class ProcGroup {
  @PrimaryColumn({type: String})
  code: string;
  @PrimaryColumn({type: Number})
  cono: number;
  @Column({type: String})
  name: string;
  @Column({type: String})
  description: string;
}
@Entity('role')
class RoleEntity {
  @Column({type: String})
  code: string;

  @Column({type: String})
  name: string;

  @Column({type: String})
  createdBy: string;

  @Column({type: Date})
  createdAt: Date;

  @Column({type: String})
  updatedBy: string | null;

  @Column({type: Date})
  updatedAt: Date | null;

  @Column({type: Number})
  cono: number;

  @Column({type: Boolean})
  status: boolean;

  @PrimaryGeneratedColumn('uuid')
  id: string;
}
export {
  ApplicationScope,
  SbuEntity,
  User,
  Application,
  BuyerDivisionEntity,
  DivisionEntity,
  FacilityEntity,
  Permission,
  ProcGroup,
  RoleEntity,
  CognitoUser,
};
