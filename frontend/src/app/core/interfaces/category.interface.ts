export interface Category {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryPayload {
  name: string;
  description: string;
  is_active?: boolean;
}
