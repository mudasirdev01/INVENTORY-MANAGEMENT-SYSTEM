export interface StockOverview {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  reorder_level: number;
  physical_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  stock_updated_at: string | null;
}

export interface StockTransaction {
  id: number;
  product: number;
  product_code: string;
  transaction_type: 'IN' | 'OUT';
  quantity: number;
  reason: string;
  reference: string;
  created_by: number;
  created_at: string;
}

export interface StockMovementPayload {
  product: number;
  quantity: number;
  reason: string;
  reference?: string;
}

export interface StockSettingsPayload {
  reserved_quantity: number;
  reorder_level: number;
}
