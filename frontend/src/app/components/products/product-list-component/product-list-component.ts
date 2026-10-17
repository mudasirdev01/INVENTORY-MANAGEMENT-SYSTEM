import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Paginator } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { InputText } from 'primeng/inputtext';
import { Category } from '../../../core/interfaces/category.interface';
import { Product } from '../../../core/interfaces/product.interface';
import { AuthService } from '../../../core/services/auth-service';
import { CategoryService } from '../../../core/services/category-service';
import { ProductService } from '../../../core/services/product-service';
import { ProductAddEditComponent } from '../product-add-edit-component/product-add-edit-component';

@Component({
  selector: 'app-product-list-component',
  standalone: true,
  imports: [
    Button,
    Card,
    FormsModule,
    InputText,
    Paginator,
    ProductAddEditComponent,
    Select,
    TableModule,
    Tag,
  ],
  templateUrl: './product-list-component.html',
  styleUrl: './product-list-component.css',
})
export class ProductListComponent implements OnInit {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  canManage = signal(false);
  dialogVisible = false;
  editingProduct = signal<Product | null>(null);
  totalRecords = signal(0);
  search = '';
  statusFilter: boolean | null = null;
  categoryFilter: number | null = null;
  page = 1;
  pageSize = 10;
  readonly statusOptions = [
    { label: 'All statuses', value: null },
    { label: 'Active', value: true },
    { label: 'Inactive', value: false },
  ];

  ngOnInit(): void {
    this.authService.getProfile().subscribe({
      next: (profile) =>
        this.canManage.set(profile.role === 'admin' || profile.role === 'inventory_manager'),
    });
    this.loadCategories();
    this.loadProducts();
  }
  loadCategories(): void {
    const params = new HttpParams()
      .set('page_size', '100')
      .set('is_active', 'true')
      .set('ordering', 'name');
    this.categoryService.getCategories(params).subscribe({
      next: (response) => this.categories.set(response.results),
      error: () => this.showError('Unable to load categories.'),
    });
  }
  loadProducts(): void {
    this.loading.set(true);
    let params = new HttpParams()
      .set('page', this.page)
      .set('page_size', this.pageSize)
      .set('ordering', 'name');
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.statusFilter !== null) params = params.set('is_active', this.statusFilter);
    if (this.categoryFilter !== null) params = params.set('category', this.categoryFilter);
    this.productService
      .getProducts(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.products.set(response.results);
          this.totalRecords.set(response.count);
        },
        error: () => this.showError('Unable to load products.'),
      });
  }
  applyFilters(): void {
    this.page = 1;
    this.loadProducts();
  }
  onPageChange(event: { first?: number; rows?: number }): void {
    this.pageSize = event.rows ?? this.pageSize;
    this.page = Math.floor((event.first ?? 0) / this.pageSize) + 1;
    this.loadProducts();
  }
  openCreate(): void {
    this.editingProduct.set(null);
    this.dialogVisible = true;
  }
  openEdit(product: Product): void {
    this.editingProduct.set(product);
    this.dialogVisible = true;
  }
  onProductSaved(message: string): void {
    this.dialogVisible = false;
    this.showSuccess(message);
    this.loadProducts();
  }
  confirmStatusChange(product: Product): void {
    const activate = !product.is_active;
    this.confirmationService.confirm({
      header: activate ? 'Activate product?' : 'Deactivate product?',
      message: activate
        ? `Make ${product.name} available again?`
        : `Deactivate ${product.name}? It will be hidden from read-only users.`,
      icon: activate ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle',
      rejectLabel: 'Cancel',
      acceptLabel: activate ? 'Activate' : 'Deactivate',
      acceptButtonStyleClass: activate ? undefined : 'p-button-danger',
      accept: () => this.changeStatus(product, activate),
    });
  }
  private changeStatus(product: Product, activate: boolean): void {
    const request: Observable<unknown> = activate
      ? this.productService.updateProduct(product.id, { is_active: true })
      : this.productService.deactivateProduct(product.id);
    request.subscribe({
      next: () => {
        this.showSuccess(activate ? 'Product activated.' : 'Product deactivated.');
        this.loadProducts();
      },
      error: () => this.showError('Unable to update product status.'),
    });
  }
  private showSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Success', detail });
  }
  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail });
  }
}
