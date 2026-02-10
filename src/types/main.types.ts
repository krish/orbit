interface BuyerDivision {
  id: string;
  code: string;
  name: string;
  description: string;
}
interface Facility {
  code: string;
  name: string;
}
interface ProcurementGroup {
  id: string;
  code: string;
  name: string;
  description: string;
}
interface Profile {
  username: string;

  fullName: string;

  isActive: boolean;

  company: number;

  roles?: Role[];

  facilities?: Facility[];

  procurementGroups?: ProcurementGroup[];

  buyerDivisions?: BuyerDivision[];

  warehouses?: Warehouse[];
}
interface Role {
  id: string;
  code: string;
  name: string;
}
interface Warehouse {
  id: string;
  code: string;
  name: string;
  facilityCode: string;
  facilityName: string;
  divisionCode: string;
  divisionName: string;
  sbuCode: string;
  sbuName: string;
}

export {BuyerDivision, Facility, ProcurementGroup, Profile, Role, Warehouse};
