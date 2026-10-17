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
import { Customer } from '../../../core/interfaces/customer.interface';
import { CustomerService } from '../../../core/services/customer-service';
import { CustomerAddEditComponent } from '../customer-add-edit-component/customer-add-edit-component';

@Component({
  selector: 'app-customer-list-component',
  standalone: true,
  imports: [
    Button,
    Card,
    CustomerAddEditComponent,
    FormsModule,
    InputText,
    Paginator,
    Select,
    TableModule,
    Tag,
  ],
  templateUrl: './customer-list-component.html',
  styleUrl: './customer-list-component.css',
})
export class CustomerListComponent implements OnInit {
  private service = inject(CustomerService);
  private auth = inject(AuthService);
  private messages = inject(MessageService);
  private confirmation = inject(ConfirmationService);
  customers = signal<Customer[]>([]);
  loading = signal(true);
  canManage = signal(false);
  dialogVisible = false;
  editingCustomer = signal<Customer | null>(null);
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
    this.auth.getProfile().subscribe({
      next: (p) => this.canManage.set(p.role === 'admin' || p.role === 'sales_executive'),
    });
    this.loadCustomers();
  }
  loadCustomers(): void {
    this.loading.set(true);
    let params = new HttpParams()
      .set('page', this.page)
      .set('page_size', this.pageSize)
      .set('ordering', 'name');
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.statusFilter !== null) params = params.set('is_active', this.statusFilter);
    this.service
      .getCustomers(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => {
          this.customers.set(r.results);
          this.totalRecords.set(r.count);
        },
        error: () => this.error('Unable to load customers.'),
      });
  }
  applyFilters(): void {
    this.page = 1;
    this.loadCustomers();
  }
  onPageChange(e: { first?: number; rows?: number }): void {
    this.pageSize = e.rows ?? this.pageSize;
    this.page = Math.floor((e.first ?? 0) / this.pageSize) + 1;
    this.loadCustomers();
  }
  openCreate(): void {
    this.editingCustomer.set(null);
    this.dialogVisible = true;
  }
  openEdit(customer: Customer): void {
    this.editingCustomer.set(customer);
    this.dialogVisible = true;
  }
  onCustomerSaved(message: string): void {
    this.dialogVisible = false;
    this.success(message);
    this.loadCustomers();
  }
  confirmStatusChange(customer: Customer): void {
    const activate = !customer.is_active;
    this.confirmation.confirm({
      header: activate ? 'Activate customer?' : 'Deactivate customer?',
      message: activate ? `Make ${customer.name} active again?` : `Deactivate ${customer.name}?`,
      icon: activate ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle',
      rejectLabel: 'Cancel',
      acceptLabel: activate ? 'Activate' : 'Deactivate',
      acceptButtonStyleClass: activate ? undefined : 'p-button-danger',
      accept: () => this.changeStatus(customer, activate),
    });
  }
  private changeStatus(customer: Customer, activate: boolean): void {
    const request: Observable<unknown> = activate
      ? this.service.updateCustomer(customer.id, { is_active: true })
      : this.service.deactivateCustomer(customer.id);
    request.subscribe({
      next: () => {
        this.success(activate ? 'Customer activated.' : 'Customer deactivated.');
        this.loadCustomers();
      },
      error: () => this.error('Unable to update customer status.'),
    });
  }
  private success(detail: string): void {
    this.messages.add({ severity: 'success', summary: 'Success', detail });
  }
  private error(detail: string): void {
    this.messages.add({ severity: 'error', summary: 'Error', detail });
  }
}
