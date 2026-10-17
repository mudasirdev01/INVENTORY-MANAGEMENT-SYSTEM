import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { finalize, Observable } from 'rxjs';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputText } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { AuthService } from '../../../core/services/auth-service';
import { Category } from '../../../core/interfaces/category.interface';
import { CategoryService } from '../../../core/services/category-service';
import { CategoryAddEditComponent } from '../category-add-edit-component/category-add-edit-component';

@Component({
  selector: 'app-category-list-component',
  standalone: true,
  imports: [
    Button,
    Card,
    CategoryAddEditComponent,
    FormsModule,
    InputText,
    Paginator,
    Select,
    TableModule,
    Tag,
  ],
  templateUrl: './category-list-component.html',
  styleUrl: './category-list-component.css',
})
export class CategoryListComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  categories = signal<Category[]>([]);
  loading = signal(true);
  canManage = signal(false);
  dialogVisible = false;
  editingCategory = signal<Category | null>(null);
  totalRecords = signal(0);
  search = '';
  statusFilter: boolean | null = null;
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
  }
  loadCategories(): void {
    this.loading.set(true);
    let params = new HttpParams()
      .set('page', this.page)
      .set('page_size', this.pageSize)
      .set('ordering', 'name');
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.statusFilter !== null) params = params.set('is_active', this.statusFilter);
    this.categoryService
      .getCategories(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.categories.set(response.results);
          this.totalRecords.set(response.count);
        },
        error: () => this.showError('Unable to load categories.'),
      });
  }
  applyFilters(): void {
    this.page = 1;
    this.loadCategories();
  }
  onPageChange(event: { first?: number; rows?: number }): void {
    this.pageSize = event.rows ?? this.pageSize;
    this.page = Math.floor((event.first ?? 0) / this.pageSize) + 1;
    this.loadCategories();
  }
  openCreate(): void {
    this.editingCategory.set(null);
    this.dialogVisible = true;
  }
  openEdit(category: Category): void {
    this.editingCategory.set(category);
    this.dialogVisible = true;
  }
  onCategorySaved(message: string): void {
    this.dialogVisible = false;
    this.showSuccess(message);
    this.loadCategories();
  }
  confirmStatusChange(category: Category): void {
    const activate = !category.is_active;
    this.confirmationService.confirm({
      header: activate ? 'Activate category?' : 'Deactivate category?',
      message: activate
        ? `Make ${category.name} available again?`
        : `Deactivate ${category.name}? It will be hidden from read-only users.`,
      icon: activate ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle',
      rejectLabel: 'Cancel',
      acceptLabel: activate ? 'Activate' : 'Deactivate',
      acceptButtonStyleClass: activate ? undefined : 'p-button-danger',
      accept: () => this.changeStatus(category, activate),
    });
  }
  private changeStatus(category: Category, activate: boolean): void {
    const request: Observable<unknown> = activate
      ? this.categoryService.updateCategory(category.id, { is_active: true })
      : this.categoryService.deactivateCategory(category.id);
    request.subscribe({
      next: () => {
        this.showSuccess(activate ? 'Category activated.' : 'Category deactivated.');
        this.loadCategories();
      },
      error: () => this.showError('Unable to update category status.'),
    });
  }
  private showSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Success', detail });
  }
  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail });
  }
}
