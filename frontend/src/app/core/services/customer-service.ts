import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import { Customer, CustomerPage, CustomerPayload } from '../interfaces/customer.interface';
export type { Customer, CustomerPage, CustomerPayload } from '../interfaces/customer.interface';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/customers`;

  getCustomers(params: HttpParams): Observable<CustomerPage> {
    return this.http.get<CustomerPage>(`${this.baseUrl}/`, { params });
  }

  createCustomer(payload: CustomerPayload): Observable<Customer> {
    return this.http.post<Customer>(`${this.baseUrl}/`, payload);
  }

  updateCustomer(id: number, payload: Partial<CustomerPayload>): Observable<Customer> {
    return this.http.patch<Customer>(`${this.baseUrl}/${id}/`, payload);
  }

  deactivateCustomer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/`);
  }
}
