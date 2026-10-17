import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { finalize } from 'rxjs';
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
import { DatePicker } from 'primeng/datepicker';
import { DisplayDatePipe } from '../../../core/common/date-format.pipe';
import { todayAsDate, toApiDate } from '../../../core/common/date-utils';
import { AuthService } from '../../../core/services/auth-service';
import { BillingService } from '../../../core/services/billing-service';
import {
  Invoice,
  Payment,
  PaymentPayload,
  PaymentStatus,
} from '../../../core/interfaces/billing.interface';
import { OrderService } from '../../../core/services/order-service';
import { SalesOrder } from '../../../core/interfaces/order.interface';
import { InvoiceDetailComponent } from '../invoice-detail-component/invoice-detail-component';
import { PaymentComponent } from '../payment-component/payment-component';

@Component({
  selector: 'app-invoice-list-component',
  standalone: true,
  imports: [
    Button,
    Card,
    DecimalPipe,
    Dialog,
    DisplayDatePipe,
    FormsModule,
    InputText,
    Paginator,
    Select,
    TableModule,
    Tag,
    InvoiceDetailComponent,
    PaymentComponent,
  ],
  templateUrl: './invoice-list-component.html',
  styleUrl: './invoice-list-component.css',
})
export class InvoiceListComponent implements OnInit {
  private billingService = inject(BillingService);
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  invoices = signal<Invoice[]>([]);
  eligibleOrders = signal<SalesOrder[]>([]);
  selectedInvoice = signal<Invoice | null>(null);
  payments = signal<Payment[]>([]);
  loading = signal(true);
  detailLoading = signal(false);
  saving = signal(false);
  canManage = signal(false);
  totalRecords = signal(0);
  paymentTotal = signal(0);
  detailsVisible = false;
  createVisible = false;
  paymentVisible = false;
  formError = signal('');

  search = '';
  paymentStatus: PaymentStatus | null = null;
  page = 1;
  pageSize = 10;
  selectedOrderId: number | null = null;
  paymentForm: PaymentPayload = this.emptyPaymentForm();
  paymentDate: Date | null = todayAsDate();

  readonly statusOptions = [
    { label: 'All payment statuses', value: null },
    { label: 'Unpaid', value: 'unpaid' },
    { label: 'Partially paid', value: 'partial' },
    { label: 'Paid', value: 'paid' },
  ];
  readonly paymentMethods = [
    { label: 'Cash', value: 'cash' },
    { label: 'Card', value: 'card' },
    { label: 'Bank transfer', value: 'bank_transfer' },
    { label: 'UPI', value: 'upi' },
    { label: 'Other', value: 'other' },
  ];

  ngOnInit(): void {
    this.authService.getProfile().subscribe({
      next: (profile) =>
        this.canManage.set(profile.role === 'admin' || profile.role === 'accountant'),
    });
    this.loadInvoices();
    this.loadEligibleOrders();
  }

  applyFilters(): void {
    this.page = 1;
    this.loadInvoices();
  }

  onPageChange(event: { first?: number; rows?: number }): void {
    this.pageSize = event.rows ?? this.pageSize;
    this.page = Math.floor((event.first ?? 0) / this.pageSize) + 1;
    this.loadInvoices();
  }

  openCreate(): void {
    this.selectedOrderId = null;
    this.formError.set('');
    this.createVisible = true;
    this.loadEligibleOrders();
  }

  createInvoice(): void {
    if (!this.selectedOrderId) {
      this.formError.set('Select a dispatched order.');
      return;
    }

    this.confirmationService.confirm({
      header: 'Create invoice?',
      message:
        'The dispatched order items and prices will be copied into an immutable invoice snapshot.',
      icon: 'pi pi-file-plus',
      rejectLabel: 'Cancel',
      acceptLabel: 'Create invoice',
      accept: () => this.saveInvoice(),
    });
  }

  openDetails(invoice: Invoice): void {
    this.selectedInvoice.set(invoice);
    this.detailsVisible = true;
    this.loadInvoiceDetails(invoice.id);
  }

  openPayment(invoice: Invoice): void {
    this.selectedInvoice.set(invoice);
    this.paymentForm = this.emptyPaymentForm();
    this.paymentDate = todayAsDate();
    this.formError.set('');
    this.paymentVisible = true;
  }

  onPaymentSaved(): void {
    this.paymentVisible = false;
    const invoice = this.selectedInvoice();
    this.loadInvoices();
    if (invoice) this.loadInvoiceDetails(invoice.id);
  }

  recordPayment(): void {
    const invoice = this.selectedInvoice();
    if (!invoice) return;
    const amount = Number(this.paymentForm.amount);
    const outstanding = Number(invoice.outstanding_amount);
    if (!amount || amount <= 0) {
      this.formError.set('Enter a payment amount greater than 0.');
      return;
    }
    if (amount > outstanding) {
      this.formError.set(
        `Payment cannot exceed outstanding balance of ₹${outstanding.toFixed(2)}.`,
      );
      return;
    }
    if (!this.paymentForm.payment_method || !this.paymentDate) {
      this.formError.set('Payment method and date are required.');
      return;
    }

    this.confirmationService.confirm({
      header: 'Record payment?',
      message: `Record ₹${amount.toFixed(2)} against ${invoice.invoice_number}?`,
      icon: 'pi pi-wallet',
      rejectLabel: 'Cancel',
      acceptLabel: 'Record payment',
      accept: () => this.savePayment(invoice.id),
    });
  }

  statusSeverity(status: PaymentStatus): 'success' | 'warn' | 'secondary' {
    return ({ unpaid: 'secondary', partial: 'warn', paid: 'success' } as const)[status];
  }

  private saveInvoice(): void {
    this.saving.set(true);
    this.billingService
      .createInvoice(this.selectedOrderId as number)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (invoice) => {
          this.createVisible = false;
          this.showSuccess(`Invoice ${invoice.invoice_number} created.`);
          this.loadInvoices();
          this.loadEligibleOrders();
        },
        error: (error) => this.formError.set(this.apiError(error, 'Unable to create invoice.')),
      });
  }

  private savePayment(invoiceId: number): void {
    this.saving.set(true);
    const payload: PaymentPayload = {
      ...this.paymentForm,
      payment_date: toApiDate(this.paymentDate),
    };
    this.billingService
      .createPayment(invoiceId, payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.paymentVisible = false;
          this.showSuccess('Payment recorded.');
          this.loadInvoices();
          this.loadInvoiceDetails(invoiceId);
        },
        error: (error) => this.formError.set(this.apiError(error, 'Unable to record payment.')),
      });
  }

  private loadInvoices(): void {
    this.loading.set(true);
    let params = new HttpParams()
      .set('page', this.page)
      .set('page_size', this.pageSize)
      .set('ordering', '-created_at');
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.paymentStatus) params = params.set('payment_status', this.paymentStatus);

    this.billingService
      .getInvoices(params)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.invoices.set(response.results);
          this.totalRecords.set(response.count);
          this.loadEligibleOrders();
        },
        error: () => this.showError('Unable to load invoices.'),
      });
  }

  private loadInvoiceDetails(invoiceId: number): void {
    this.detailLoading.set(true);
    this.billingService
      .getInvoice(invoiceId)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (invoice) => {
          this.selectedInvoice.set(invoice);
          this.loadPayments(invoice.id);
        },
        error: () => this.showError('Unable to load invoice details.'),
      });
  }

  private loadPayments(invoiceId: number): void {
    this.billingService.getPayments(invoiceId, new HttpParams().set('page_size', '100')).subscribe({
      next: (response) => {
        this.payments.set(response.results);
        this.paymentTotal.set(response.count);
      },
      error: () => this.showError('Unable to load payment history.'),
    });
  }

  private loadEligibleOrders(): void {
    this.orderService
      .getOrders(
        new HttpParams()
          .set('status', 'dispatched')
          .set('page_size', '100')
          .set('ordering', '-created_at'),
      )
      .subscribe({
        next: (response) => {
          const invoicedOrderNumbers = new Set(
            this.invoices().map((invoice) => invoice.order_number),
          );
          this.eligibleOrders.set(
            response.results.filter((order) => !invoicedOrderNumbers.has(order.order_number)),
          );
        },
        error: () => this.showError('Unable to load dispatched orders.'),
      });
  }

  private emptyPaymentForm(): PaymentPayload {
    return {
      amount: 0,
      payment_method: 'cash',
      reference: '',
      payment_date: '',
    };
  }

  private apiError(error: HttpErrorResponse, fallback: string): string {
    const body = error.error;
    if (typeof body === 'string' && body.trim()) return body;
    if (body && typeof body === 'object') {
      const first = Object.values(body as Record<string, unknown>)[0];
      if (Array.isArray(first) && first[0]) return String(first[0]);
      if (typeof first === 'string') return first;
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
