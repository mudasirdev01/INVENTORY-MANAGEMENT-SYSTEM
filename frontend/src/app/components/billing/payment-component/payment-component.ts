import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { Button } from 'primeng/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { todayAsDate, toApiDate } from '../../../core/common/date-utils';
import { BillingService } from '../../../core/services/billing-service';
import { Invoice, PaymentPayload } from '../../../core/interfaces/billing.interface';
@Component({
  selector: 'app-payment-component',
  standalone: true,
  imports: [Button, DatePicker, Dialog, FormsModule, InputNumber, InputText, Select],
  templateUrl: './payment-component.html',
  styleUrl: './payment-component.css',
})
export class PaymentComponent {
  private service = inject(BillingService);
  private confirmation = inject(ConfirmationService);
  private messages = inject(MessageService);
  @Input() visible = false;
  @Input() invoice: Invoice | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();
  saving = signal(false);
  error = signal('');
  amount = 0;
  method = 'cash';
  reference = '';
  date: Date | null = todayAsDate();
  readonly methods = [
    { label: 'Cash', value: 'cash' },
    { label: 'Card', value: 'card' },
    { label: 'Bank transfer', value: 'bank_transfer' },
    { label: 'UPI', value: 'upi' },
    { label: 'Other', value: 'other' },
  ];
  close(): void {
    if (!this.saving()) this.visibleChange.emit(false);
  }
  record(): void {
    const outstanding = Number(this.invoice?.outstanding_amount || 0);
    if (!this.invoice || !this.amount || this.amount <= 0) {
      this.error.set('Enter a payment amount greater than 0.');
      return;
    }
    if (this.amount > outstanding) {
      this.error.set(`Payment cannot exceed outstanding balance of ₹${outstanding.toFixed(2)}.`);
      return;
    }
    if (!this.method || !this.date) {
      this.error.set('Payment method and date are required.');
      return;
    }
    this.confirmation.confirm({
      header: 'Record payment?',
      message: `Record ₹${this.amount.toFixed(2)} against ${this.invoice.invoice_number}?`,
      icon: 'pi pi-wallet',
      rejectLabel: 'Cancel',
      acceptLabel: 'Record payment',
      accept: () => this.submit(),
    });
  }
  private submit(): void {
    const payload: PaymentPayload = {
      amount: this.amount,
      payment_method: this.method,
      reference: this.reference.trim(),
      payment_date: toApiDate(this.date),
    };
    this.saving.set(true);
    this.service
      .createPayment(this.invoice!.id, payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.messages.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Payment recorded.',
          });
          this.reset();
          this.saved.emit();
        },
        error: (e) => this.error.set(this.apiError(e)),
      });
  }
  private reset(): void {
    this.amount = 0;
    this.reference = '';
    this.date = todayAsDate();
    this.error.set('');
  }
  private apiError(error: HttpErrorResponse): string {
    const body = error.error;
    const first =
      body && typeof body === 'object' ? Object.values(body as Record<string, unknown>)[0] : null;
    return Array.isArray(first) ? String(first[0]) : String(first || 'Unable to record payment.');
  }
}
