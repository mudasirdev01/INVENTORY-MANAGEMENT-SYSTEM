import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { finalize } from 'rxjs';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { DisplayDatePipe } from '../../../core/common/date-format.pipe';
import { AuthService } from '../../../core/services/auth-service';
import { InventoryService } from '../../../core/services/inventory-service';
import { StockOverview, StockTransaction } from '../../../core/interfaces/inventory.interface';
import { StockMovementComponent } from '../stock-movement-component/stock-movement-component';
import { StockSettingsComponent } from '../stock-settings-component/stock-settings-component';

type InventoryView = 'overview' | 'low-stock' | 'history';
type MovementType = 'IN' | 'OUT';

@Component({
  selector: 'app-inventory-list-component',
  standalone: true,
  imports: [
    Button,
    Card,
    DisplayDatePipe,
    FormsModule,
    InputText,
    Paginator,
    Select,
    StockMovementComponent,
    StockSettingsComponent,
    TableModule,
    Tag,
  ],
  templateUrl: './inventory-list-component.html',
  styleUrl: './inventory-list-component.css',
})
export class InventoryListComponent implements OnInit {
  private service = inject(InventoryService);
  private auth = inject(AuthService);
  view: InventoryView = 'overview';
  stock = signal<StockOverview[]>([]);
  transactions = signal<StockTransaction[]>([]);
  productOptions = signal<StockOverview[]>([]);
  loading = signal(true);
  canManage = signal(false);
  totalRecords = signal(0);
  movementVisible = false;
  settingsVisible = false;
  movementType: MovementType = 'IN';
  selectedProduct = signal<StockOverview | null>(null);
  search = '';
  transactionType: 'ALL' | MovementType = 'ALL';
  transactionProduct: number | null = null;
  page = 1;
  pageSize = 10;
  readonly transactionTypes = [
    { label: 'All types', value: 'ALL' },
    { label: 'Stock IN', value: 'IN' },
    { label: 'Stock OUT', value: 'OUT' },
  ];
  ngOnInit(): void {
    this.auth.getProfile().subscribe({
      next: (p) => this.canManage.set(p.role === 'admin' || p.role === 'inventory_manager'),
    });
    this.loadProductOptions();
    this.loadData();
  }
  selectView(view: InventoryView): void {
    this.view = view;
    this.page = 1;
    this.loadData();
  }
  applyFilters(): void {
    this.page = 1;
    this.loadData();
  }
  onPageChange(e: { first?: number; rows?: number }): void {
    this.pageSize = e.rows ?? this.pageSize;
    this.page = Math.floor((e.first ?? 0) / this.pageSize) + 1;
    this.loadData();
  }
  openMovement(type: MovementType, product: StockOverview): void {
    this.movementType = type;
    this.selectedProduct.set(product);
    this.movementVisible = true;
  }
  openSettings(product: StockOverview): void {
    this.selectedProduct.set(product);
    this.settingsVisible = true;
  }
  onChanged(): void {
    this.movementVisible = false;
    this.settingsVisible = false;
    this.loadProductOptions();
    this.loadData();
  }
  private loadData(): void {
    this.loading.set(true);
    let params = new HttpParams().set('page', this.page).set('page_size', this.pageSize);
    if (this.search.trim()) params = params.set('search', this.search.trim());
    const request: any =
      this.view === 'history'
        ? this.service.getTransactions(this.transactionParams(params))
        : this.view === 'low-stock'
          ? this.service.getLowStock(params)
          : this.service.getStock(params);
    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response: any) => {
        this.totalRecords.set(response.count);
        if (this.view === 'history') this.transactions.set(response.results as StockTransaction[]);
        else this.stock.set(response.results as StockOverview[]);
      },
      error: () => this.loading.set(false),
    });
  }
  private loadProductOptions(): void {
    this.service
      .getStock(new HttpParams().set('page_size', '100').set('ordering', 'name'))
      .subscribe({ next: (response) => this.productOptions.set(response.results) });
  }
  private transactionParams(params: HttpParams): HttpParams {
    if (this.transactionType !== 'ALL') params = params.set('type', this.transactionType);
    if (this.transactionProduct !== null) params = params.set('product', this.transactionProduct);
    return params;
  }
}
