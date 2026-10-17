import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaginatedResponse } from '../interfaces/api-types';
import { Category, CategoryPayload } from '../interfaces/category.interface';
export type { Category, CategoryPayload } from '../interfaces/category.interface';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/products/categories`;

  getCategories(params: HttpParams): Observable<PaginatedResponse<Category>> {
    return this.http.get<PaginatedResponse<Category>>(`${this.baseUrl}/`, { params });
  }

  createCategory(payload: CategoryPayload): Observable<Category> {
    return this.http.post<Category>(`${this.baseUrl}/`, payload);
  }

  updateCategory(id: number, payload: Partial<CategoryPayload>): Observable<Category> {
    return this.http.patch<Category>(`${this.baseUrl}/${id}/`, payload);
  }

  deactivateCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/`);
  }
}
