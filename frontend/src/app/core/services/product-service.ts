import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../interfaces/api-types';
import { Product, ProductPayload } from '../interfaces/product.interface';
export type { Product, ProductPayload } from '../interfaces/product.interface';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/products`;

  getProducts(params: HttpParams): Observable<PaginatedResponse<Product>> {
    return this.http.get<PaginatedResponse<Product>>(`${this.baseUrl}/`, { params });
  }

  createProduct(payload: ProductPayload): Observable<Product> {
    return this.http.post<Product>(`${this.baseUrl}/`, payload);
  }

  updateProduct(id: number, payload: Partial<ProductPayload>): Observable<Product> {
    return this.http.patch<Product>(`${this.baseUrl}/${id}/`, payload);
  }

  deactivateProduct(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/`);
  }
}
