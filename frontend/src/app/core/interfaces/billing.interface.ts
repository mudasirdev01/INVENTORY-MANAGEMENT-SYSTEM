export type PaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface InvoiceItem {
  id: number;
  product_code: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  order_number: string;
  customer: number;
  customer_name: string;
  items: InvoiceItem[];
  total_amount: string;
  paid_amount: string;
  outstanding_amount: string;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface InvoicePage { count: number; next: string | null; previous: string | null; results: Invoice[]; }

export interface Payment {
  id: number;
  invoice: number;
  invoice_number: string;
  amount: string;
  payment_method: string;
  payment_method_display: string;
  reference: string;
  payment_date: string;
  created_by: number;
  created_at: string;
}

export interface PaymentPage { count: number; next: string | null; previous: string | null; results: Payment[]; }

export interface PaymentPayload { amount: number; payment_method: string; reference: string; payment_date: string; }
