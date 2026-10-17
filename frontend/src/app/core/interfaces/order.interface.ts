export type OrderStatus = 'pending' | 'confirmed' | 'dispatched' | 'cancelled';

export interface OrderItem {
  id: number;
  product: number;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface SalesOrder {
  id: number;
  order_number: string;
  customer: number;
  customer_name: string;
  items: OrderItem[];
  status: OrderStatus;
  status_display: string;
  total_amount: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface OrderPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: SalesOrder[];
}

export interface OrderPayload {
  customer: number;
  items: Array<{ product: number; quantity: number }>;
}
