import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import { OrderPage, OrderPayload, SalesOrder } from '../interfaces/order.interface';
export type { OrderItem, OrderPage, OrderPayload, OrderStatus, SalesOrder } from '../interfaces/order.interface';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/orders`;

  getOrders(params: HttpParams): Observable<OrderPage> {
    return this.http.get<OrderPage>(`${this.baseUrl}/`, { params });
  }

  getOrder(id: number): Observable<SalesOrder> {
    return this.http.get<SalesOrder>(`${this.baseUrl}/${id}/`);
  }

  createOrder(payload: OrderPayload): Observable<SalesOrder> {
    return this.http.post<SalesOrder>(`${this.baseUrl}/`, payload);
  }

  updateOrder(id: number, payload: OrderPayload): Observable<SalesOrder> {
    return this.http.patch<SalesOrder>(`${this.baseUrl}/${id}/`, payload);
  }

  confirmOrder(id: number): Observable<SalesOrder> {
    return this.http.post<SalesOrder>(`${this.baseUrl}/${id}/confirm/`, {});
  }

  dispatchOrder(id: number): Observable<SalesOrder> {
    return this.http.post<SalesOrder>(`${this.baseUrl}/${id}/dispatch/`, {});
  }

  cancelOrder(id: number): Observable<SalesOrder> {
    return this.http.post<SalesOrder>(`${this.baseUrl}/${id}/cancel/`, {});
  }
}
