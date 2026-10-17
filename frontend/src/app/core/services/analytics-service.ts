import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import { DashboardSummary, LowStockProduct, MonthlySales, RecentOrder, TopProduct } from '../interfaces/analytics.interface';
export type { DashboardSummary, LowStockProduct, MonthlySales, RecentOrder, TopProduct } from '../interfaces/analytics.interface';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/analytics`;

  getDashboard(params: HttpParams): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${this.baseUrl}/dashboard/`, { params });
  }

  getMonthlySales(params: HttpParams): Observable<MonthlySales[]> {
    return this.http.get<MonthlySales[]>(`${this.baseUrl}/monthly-sales/`, { params });
  }

  getTopProducts(params: HttpParams): Observable<TopProduct[]> {
    return this.http.get<TopProduct[]>(`${this.baseUrl}/top-products/`, { params });
  }

  getRecentOrders(params: HttpParams): Observable<RecentOrder[]> {
    return this.http.get<RecentOrder[]>(`${this.baseUrl}/recent-orders/`, { params });
  }

  getLowStock(params: HttpParams): Observable<LowStockProduct[]> {
    return this.http.get<LowStockProduct[]>(`${this.baseUrl}/low-stock/`, { params });
  }
}
