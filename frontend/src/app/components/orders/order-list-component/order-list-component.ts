import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { finalize, Observable } from 'rxjs';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { DisplayDatePipe } from '../../../core/common/date-format.pipe';
import { AuthService } from '../../../core/services/auth-service';
import { Product } from '../../../core/interfaces/product.interface';
import { ProductService } from '../../../core/services/product-service';
import { Customer } from '../../../core/interfaces/customer.interface';
import { CustomerService } from '../../../core/services/customer-service';
import {
  OrderItem,
  OrderPayload,
  OrderStatus,
  SalesOrder,
} from '../../../core/interfaces/order.interface';
import { OrderService } from '../../../core/services/order-service';
import { OrderAddEditComponent } from '../order-add-edit-component/order-add-edit-component';
import { OrderDetailComponent } from '../order-detail-component/order-detail-component';

interface OrderLineForm {
  product: number | null;
  quantity: number | null;
}

@Component({
  selector: 'app-order-list-component',
  standalone: true,
  imports: [
    Button,
    Card,
    DecimalPipe,
    DisplayDatePipe,
    FormsModule,
    InputText,
    Paginator,
    Select,
    TableModule,
    Tag,
    OrderAddEditComponent,
    OrderDetailComponent,
  ],
  templateUrl: './order-list-component.html',
  styleUrl: './order-list-component.css',
})
export class OrderListComponent implements OnInit {
  private orderService = inject(OrderService);
  private productService = inject(ProductService);
  private customerService = inject(CustomerService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  orders = signal<SalesOrder[]>([]);
  customers = signal<Customer[]>([]);
  products = signal<Product[]>([]);
  selectedOrder = signal<SalesOrder | null>(null);
  editingOrder = signal<SalesOrder | null>(null);
  loading = signal(true);
  customersLoading = signal(true);
  productsLoading = signal(true);
  saving = signal(false);
  canManage = signal(false);
  totalRecords = signal(0);
  detailsVisible = false;
  editorVisible = false;
  formError = signal('');

  search = '';
  statusFilter: OrderStatus | null = null;
  customerId: number | null = null;
  selectedCustomer: number | null = null;
  lines: OrderLineForm[] = [this.emptyLine()];
  page = 1;
  pageSize = 10;

  readonly statusOptions = [
    { label: 'All statuses', value: null },
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Dispatched', value: 'dispatched' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  ngOnInit(): void {
    this.authService.getProfile().subscribe({
      next: (profile) =>
        this.canManage.set(profile.role === 'admin' || profile.role === 'sales_executive'),
    });
    this.loadCustomers();
    this.loadProducts();
    this.loadOrders();
  }

  applyFilters(): void {
    this.page = 1;
    this.loadOrders();
  }

  onPageChange(event: { first?: number; rows?: number }): void {
    this.pageSize = event.rows ?? this.pageSize;
    this.page = Math.floor((event.first ?? 0) / this.pageSize) + 1;
    this.loadOrders();
  }

  openCreate(): void {
    this.editingOrder.set(null);
    this.selectedCustomer = null;
    this.lines = [this.emptyLine()];
    this.formError.set('');
    this.editorVisible = true;
  }

  openEdit(order: SalesOrder): void {
    this.editingOrder.set(order);
    this.selectedCustomer = order.customer;
    this.lines = order.items.map((item) => ({ product: item.product, quantity: item.quantity }));
    this.formError.set('');
    this.editorVisible = true;
  }

  openDetails(order: SalesOrder): void {
    this.selectedOrder.set(order);
    this.detailsVisible = true;
  }

  onOrderSaved(message: string): void {
    this.editorVisible = false;
    this.showSuccess(message);
    this.loadOrders();
  }

  addLine(): void {
    this.lines.push(this.emptyLine());
  }

  removeLine(index: number): void {
    if (this.lines.length > 1) this.lines.splice(index, 1);
  }

  productFor(id: number | null): Product | undefined {
    return this.products().find((product) => product.id === id);
  }

  lineTotal(line: OrderLineForm): number {
    const product = this.productFor(line.product);
    return product && line.quantity ? Number(product.unit_price) * line.quantity : 0;
  }

  grandTotal(): number {
    return this.lines.reduce((total, line) => total + this.lineTotal(line), 0);
  }

  canSubmitOrder(): boolean {
    return (
      !!this.selectedCustomer &&
      !!this.lines.length &&
      this.lines.every((line) => !!line.product && !!line.quantity && line.quantity >= 1) &&
      new Set(this.lines.map((line) => line.product)).size === this.lines.length
    );
  }

  statusSeverity(status: OrderStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    return (
      {
        pending: 'warn',
        confirmed: 'info',
        dispatched: 'success',
        cancelled: 'danger',
      } as const
    )[status];
  }

  saveOrder(): void {
    if (!this.isFormValid()) return;

    const payload: OrderPayload = {
      customer: this.selectedCustomer as number,
      items: this.lines.map((line) => ({
        product: line.product as number,
        quantity: line.quantity as number,
      })),
    };
    const order = this.editingOrder();
    const request = order
      ? this.orderService.updateOrder(order.id, payload)
      : this.orderService.createOrder(payload);

    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        this.editorVisible = false;
        this.showSuccess(order ? 'Order updated.' : `Order ${saved.order_number} created.`);
        this.loadOrders();
      },
      error: (error) => this.formError.set(this.apiError(error, 'Unable to save order.')),
    });
  }

  confirmAction(order: SalesOrder, action: 'confirm' | 'dispatch' | 'cancel'): void {
    const labels = {
      confirm: {
        header: 'Confirm order?',
        message: 'This will reserve available stock.',
        accept: 'Confirm',
        severity: 'success',
      },
      dispatch: {
        header: 'Dispatch order?',
        message: 'This will deduct physical stock and release the reservation.',
        accept: 'Dispatch',
        severity: 'info',
      },
      cancel: {
        header: 'Cancel order?',
        message: 'Any stock reservation will be released.',
        accept: 'Cancel order',
        severity: 'danger',
      },
    }[action];

    this.confirmationService.confirm({
      header: labels.header,
      message: `${order.order_number}: ${labels.message}`,
      icon: action === 'cancel' ? 'pi pi-exclamation-triangle' : 'pi pi-check-circle',
      rejectLabel: 'Keep order',
      acceptLabel: labels.accept,
      acceptButtonStyleClass: action === 'cancel' ? 'p-button-danger' : undefined,
      accept: () => this.changeStatus(order, action),
    });
  }

  private changeStatus(order: SalesOrder, action: 'confirm' | 'dispatch' | 'cancel'): void {
    const requests: Record<'confirm' | 'dispatch' | 'cancel', () => Observable<SalesOrder>> = {
      confirm: () => this.orderService.confirmOrder(order.id),
      dispatch: () => this.orderService.dispatchOrder(order.id),
      cancel: () => this.orderService.cancelOrder(order.id),
    };

    this.saving.set(true);
    requests[action]()
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updated) => {
          this.showSuccess(`Order ${updated.status_display.toLowerCase()}.`);
          this.selectedOrder.set(updated);
          this.detailsVisible = false;
          this.loadOrders();
        },
        error: (error) => this.showError(this.apiError(error, 'Unable to change order status.')),
      });
  }

  private loadOrders(): void {
    this.loading.set(true);
    let params = new HttpParams()
      .set('page', this.page)
      .set('page_size', this.pageSize)
      .set('ordering', '-created_at');
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.statusFilter) params = params.set('status', this.statusFilter);
    if (this.customerId !== null) params = params.set('customer', this.customerId);

    this.orderService
      .getOrders(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.orders.set(response.results);
          this.totalRecords.set(response.count);
        },
        error: () => this.showError('Unable to load orders.'),
      });
  }

  private loadCustomers(): void {
    this.customersLoading.set(true);
    this.customerService
      .getCustomers(new HttpParams().set('page_size', '100').set('ordering', 'name'))
      .pipe(finalize(() => this.customersLoading.set(false)))
      .subscribe({
        next: (response) => this.customers.set(response.results),
        error: () => this.showError('Unable to load customers for the order form.'),
      });
  }

  private loadProducts(): void {
    this.productsLoading.set(true);
    this.productService
      .getProducts(
        new HttpParams().set('page_size', '100').set('is_active', 'true').set('ordering', 'name'),
      )
      .pipe(finalize(() => this.productsLoading.set(false)))
      .subscribe({
        next: (response) => this.products.set(response.results),
        error: () => this.showError('Unable to load active products for the order form.'),
      });
  }

  private isFormValid(): boolean {
    if (!this.selectedCustomer) {
      this.formError.set('Select a customer.');
      return false;
    }
    if (
      !this.lines.length ||
      this.lines.some((line) => !line.product || !line.quantity || line.quantity < 1)
    ) {
      this.formError.set('Each order line needs a product and quantity of at least 1.');
      return false;
    }
    const productIds = this.lines.map((line) => line.product);
    if (new Set(productIds).size !== productIds.length) {
      this.formError.set('A product can appear only once per order.');
      return false;
    }
    this.formError.set('');
    return true;
  }

  private emptyLine(): OrderLineForm {
    return { product: null, quantity: 1 };
  }

  private apiError(error: HttpErrorResponse, fallback: string): string {
    const body = error.error;
    if (typeof body === 'string' && body.trim()) return body;
    if (body && typeof body === 'object') {
      const values = Object.values(body as Record<string, unknown>);
      const first = values[0];
      if (Array.isArray(first) && first[0]) return String(first[0]);
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object')
        return this.apiError({ error: first } as HttpErrorResponse, fallback);
    }
    return fallback;
  }

  private showSuccess(detail: string): void {
    this.messageService.add({ severity: 'success', summary: 'Success', detail });
  }

  private showError(detail: string): void {
    this.messageService.add({ severity: 'error', summary: 'Error', detail, life: 6000 });
  }
}
