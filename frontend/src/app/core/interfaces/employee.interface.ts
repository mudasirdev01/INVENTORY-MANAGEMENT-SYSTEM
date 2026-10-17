export type EmployeeRole =
  | 'admin'
  | 'inventory_manager'
  | 'sales_executive'
  | 'accountant';

export interface Employee {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: EmployeeRole;
  is_active: boolean;
  date_joined: string;
}

export interface EmployeeCreatePayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: EmployeeRole;
}

export interface EmployeeUpdatePayload {
  email: string;
  first_name: string;
  last_name: string;
  role: EmployeeRole;
  is_active: boolean;
}
