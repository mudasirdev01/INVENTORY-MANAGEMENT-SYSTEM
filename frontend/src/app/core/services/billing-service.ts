import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import { Invoice, InvoicePage, Payment, PaymentPage, PaymentPayload } from '../interfaces/billing.interface';
export type { Invoice, InvoiceItem, InvoicePage, Payment, PaymentPage, PaymentPayload, PaymentStatus } from '../interfaces/billing.interface';

@Injectable({ providedIn: 'root' })
export class BillingService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/billing`;

  getInvoices(params: HttpParams): Observable<InvoicePage> {
    return this.http.get<InvoicePage>(`${this.baseUrl}/invoices/`, { params });
  }

  getInvoice(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.baseUrl}/invoices/${id}/`);
  }

  createInvoice(orderId: number): Observable<Invoice> {
    return this.http.post<Invoice>(`${this.baseUrl}/invoices/`, { order: orderId });
  }

  getPayments(invoiceId: number, params: HttpParams): Observable<PaymentPage> {
    return this.http.get<PaymentPage>(`${this.baseUrl}/invoices/${invoiceId}/payments/`, { params });
  }

  createPayment(invoiceId: number, payload: PaymentPayload): Observable<Payment> {
    return this.http.post<Payment>(`${this.baseUrl}/invoices/${invoiceId}/payments/`, payload);
  }
}
