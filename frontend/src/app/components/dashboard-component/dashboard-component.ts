import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { DatePicker } from 'primeng/datepicker';
import { Skeleton } from 'primeng/skeleton';
import { Tag } from 'primeng/tag';
import {
  DashboardSummary,
  LowStockProduct,
  MonthlySales,
  RecentOrder,
  TopProduct,
} from '../../core/interfaces/analytics.interface';
import { AnalyticsService } from '../../core/services/analytics-service';
import { toApiDate } from '../../core/common/date-utils';
import { DisplayDatePipe } from '../../core/common/date-format.pipe';
import { AuthService } from '../../core/services/auth-service';

@Component({
  selector: 'app-dashboard-component',
  standalone: true,
  imports: [
    Button,
    Card,
    ChartModule,
    DatePicker,
    DecimalPipe,
    DisplayDatePipe,
    FormsModule,
    RouterLink,
    Skeleton,
    Tag,
  ],
  templateUrl: './dashboard-component.html',
  styleUrl: './dashboard-component.scss',
})
export class DashboardComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private authService = inject(AuthService);

  summary = signal<DashboardSummary | null>(null);
  monthlySales = signal<MonthlySales[]>([]);
  topProducts = signal<TopProduct[]>([]);
  recentOrders = signal<RecentOrder[]>([]);
  lowStockProducts = signal<LowStockProduct[]>([]);
  monthlyChartData = signal<any>(null);
  topProductsChartData = signal<any>(null);
  loading = signal(true);
  error = signal('');

  startDate: Date | null = new Date();
  endDate: Date | null = new Date();

  readonly monthlyChartOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#edf1f6' }, ticks: { color: '#64748b' } },
      y: { beginAtZero: true, grid: { color: '#edf1f6' }, ticks: { color: '#64748b' } },
    },
  };
  readonly topProductsChartOptions = {
    indexAxis: 'y' as const,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: '#edf1f6' }, ticks: { color: '#64748b' } },
      y: { grid: { display: false }, ticks: { color: '#334155' } },
    },
  };

  ngOnInit(): void {
    this.authService.getProfile().subscribe();
    this.loadAnalytics();
  }

  displayName(): string {
    const profile = this.authService.profile();
    const fullName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim();
    return fullName || profile?.email?.split('@')[0] || 'User';
  }

  applyDateRange(): void {
    this.loadAnalytics();
  }

  clearDateRange(): void {
    this.startDate = null;
    this.endDate = null;
    this.loadAnalytics();
  }

  statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    return (
      ({ pending: 'warn', confirmed: 'info', dispatched: 'success', cancelled: 'danger' } as const)[
        status as 'pending' | 'confirmed' | 'dispatched' | 'cancelled'
      ] ?? 'secondary'
    );
  }

  private loadAnalytics(): void {
    this.loading.set(true);
    this.error.set('');
    const params = this.dateParams();

    forkJoin({
      summary: this.analyticsService.getDashboard(params),
      monthlySales: this.analyticsService.getMonthlySales(params),
      topProducts: this.analyticsService.getTopProducts(params.set('limit', '5')),
      recentOrders: this.analyticsService.getRecentOrders(params.set('limit', '8')),
      lowStock: this.analyticsService.getLowStock(params.set('limit', '8')),
    }).subscribe({
      next: (data) => {
        this.summary.set(data.summary);
        this.monthlySales.set(data.monthlySales);
        this.topProducts.set(data.topProducts);
        this.recentOrders.set(data.recentOrders);
        this.lowStockProducts.set(data.lowStock);
        this.monthlyChartData.set(this.buildMonthlyChart(data.monthlySales));
        this.topProductsChartData.set(this.buildTopProductsChart(data.topProducts));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Dashboard analytics could not be loaded. Please try again.');
      },
    });
  }

  private dateParams(): HttpParams {
    let params = new HttpParams();
    if (this.startDate) params = params.set('start_date', toApiDate(this.startDate));
    if (this.endDate) params = params.set('end_date', toApiDate(this.endDate));
    return params;
  }

  private buildMonthlyChart(rows: MonthlySales[]): any {
    return {
      labels: rows.map((row) => row.month),
      datasets: [
        {
          label: 'Dispatched sales',
          data: rows.map((row) => Number(row.sales_total)),
          borderColor: '#2563eb',
          backgroundColor: '#60a5fa',
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    };
  }

  private buildTopProductsChart(rows: TopProduct[]): any {
    return {
      labels: rows.map((row) => row.name),
      datasets: [
        {
          label: 'Units sold',
          data: rows.map((row) => row.quantity_sold),
          backgroundColor: ['#2563eb', '#14b8a6', '#f59e0b', '#8b5cf6', '#f43f5e'],
          borderRadius: 6,
        },
      ],
    };
  }
}
