export interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: Customer[];
}

export interface CustomerPayload {
  name: string;
  email: string | null;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_active?: boolean;
}
