export interface Product {
  id: number;
  code: string;
  name: string;
  description: string;
  category: number;
  category_name: string;
  unit_price: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductPayload {
  code: string;
  name: string;
  description: string;
  category: number;
  unit_price: number;
  is_active?: boolean;
}
