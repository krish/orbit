import {Column, Entity, PrimaryColumn, PrimaryGeneratedColumn} from 'typeorm';

@Entity('sbuToWarehouse')
/* It's a class that represents a table in the database */
class SbuWarehouseMapper {
  @Column({type: Number, name: 'cono'})
  cono: number;

  @Column({type: String, name: 'code'}) //WH Code from warehouse table, ideally it should be WhCode
  code: string;

  @Column({type: String, name: 'name'})
  name: string;

  @Column({type: String, name: 'facility'})
  facility: string;

  @Column({type: String, name: 'division'})
  division: string;

  @Column({type: Date, name: 'activeFrom'})
  activeFrom: Date;

  @Column({type: Date, name: 'activeTo'})
  activeTo: Date;

  @Column({type: String, name: 'createdBy'})
  createdBy: string;

  @Column({type: Date, name: 'createdAt'})
  createdAt: Date;

  @Column({type: String, name: 'updatedBy'})
  updatedBy: string;

  @Column({type: Date, name: 'updatedAt'})
  updatedAt: Date;

  @PrimaryGeneratedColumn()
  id: string;

  @Column({type: String})
  sbuId: string;
}
@Entity('userToRole')
class UserRoleMapper {
  @Column({type: String})
  createdBy: string;

  @Column({type: Date})
  createdAt: Date;

  @Column({type: String})
  userName: string;

  @Column({type: String})
  roleId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;
}
@Entity('userToFunction')
class UserFunctionMapper {
  @Column({type: String})
  code: string;

  @Column({type: String})
  name: string;

  @Column({type: String})
  createdBy: string;

  @Column({type: Date})
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;
}
@Entity('applicationToScope')
class AppScopeMapper {
  @PrimaryColumn({type: String})
  appId: string;

  @PrimaryColumn({type: String})
  scopeId: string;
}

@Entity('roleToFunction')
class RoleFunctionMapper {
  @PrimaryColumn({type: String})
  roleId: string;

  @PrimaryColumn({type: String})
  funcId: string;
}
@Entity('userToBuyerdivision')
class UserBuyerDivisionMapper {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({type: Number})
  cono: number;

  @Column({type: String})
  userName: string;

  @Column({type: String})
  code: string;

  @Column({type: String})
  createdBy: string;

  @Column({type: Date})
  createdAt: Date;
}
@Entity('userToProcurementgroup')
class UserProcGropMapper {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({type: Number})
  cono: number;

  @Column({type: String})
  userName: string;

  @Column({type: String})
  code: string;

  @Column({type: String})
  createdBy: string;

  @Column({type: Date})
  createdAt: Date;
}
@Entity('userToWarehouse')
class UserWarehouseMapper {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({name: 'userName', type: String})
  userName: string;

  @Column({name: 'whId', type: String})
  whId: string;

  @Column({name: 'isReadOnly', type: Boolean})
  isReadOnly: boolean;

  @Column({name: 'createdBy', type: String})
  createdBy: string;

  @Column({name: 'createdAt', type: Date})
  createdAt: Date;

  @Column({name: 'updatedBy', type: String})
  updatedBy: string;

  @Column({name: 'updatedAt', type: Date})
  updatedAt: Date;
}

export {
  UserRoleMapper,
  UserFunctionMapper,
  UserWarehouseMapper,
  UserProcGropMapper,
  UserBuyerDivisionMapper,
  RoleFunctionMapper,
  AppScopeMapper,
  SbuWarehouseMapper,
};
