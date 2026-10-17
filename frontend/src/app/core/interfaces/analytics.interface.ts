export interface DashboardSummary {
  products_count: number;
  customers_count: number;
  orders_count: number;
  stock_items_count: number;
  low_stock_count: number;
  dispatched_sales_total: string;
  payments_received_total: string;
  outstanding_balance: string;
}

export interface MonthlySales { month: string; sales_total: string; order_count: number; }
export interface TopProduct { product_id: number; code: string; name: string; quantity_sold: number; sales_total: string; }
export interface RecentOrder { id: number; order_number: string; customer_name: string; status: string; total_amount: string; created_at: string; }
export interface LowStockProduct { product_id: number; code: string; name: string; physical_quantity: number; reserved_quantity: number; available_quantity: number; reorder_level: number; }
