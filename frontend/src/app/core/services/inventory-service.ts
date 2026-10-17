import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import { PaginatedResponse } from '../interfaces/api-types';
import { StockMovementPayload, StockOverview, StockSettingsPayload, StockTransaction } from '../interfaces/inventory.interface';
export type { StockMovementPayload, StockOverview, StockSettingsPayload, StockTransaction } from '../interfaces/inventory.interface';
export type { PaginatedResponse } from '../interfaces/api-types';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/inventory`;

  getStock(params: HttpParams): Observable<PaginatedResponse<StockOverview>> {
    return this.http.get<PaginatedResponse<StockOverview>>(`${this.baseUrl}/stock/`, { params });
  }

  getLowStock(params: HttpParams): Observable<PaginatedResponse<StockOverview>> {
    return this.http.get<PaginatedResponse<StockOverview>>(`${this.baseUrl}/low-stock/`, { params });
  }

  updateStockSettings(productId: number, payload: StockSettingsPayload): Observable<StockOverview> {
    return this.http.patch<StockOverview>(`${this.baseUrl}/stock/${productId}/`, payload);
  }

  stockIn(payload: StockMovementPayload): Observable<StockTransaction> {
    return this.http.post<StockTransaction>(`${this.baseUrl}/stock/in/`, payload);
  }

  stockOut(payload: StockMovementPayload): Observable<StockTransaction> {
    return this.http.post<StockTransaction>(`${this.baseUrl}/stock/out/`, payload);
  }

  getTransactions(params: HttpParams): Observable<PaginatedResponse<StockTransaction>> {
    return this.http.get<PaginatedResponse<StockTransaction>>(`${this.baseUrl}/transactions/`, { params });
  }
}
