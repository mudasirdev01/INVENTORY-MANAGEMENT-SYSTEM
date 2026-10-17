import { DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { DisplayDatePipe } from '../../../core/common/date-format.pipe';
import { Invoice, Payment, PaymentStatus } from '../../../core/interfaces/billing.interface';
@Component({
  selector: 'app-invoice-detail-component',
  standalone: true,
  imports: [Button, DecimalPipe, Dialog, DisplayDatePipe, TableModule, Tag],
  templateUrl: './invoice-detail-component.html',
  styleUrl: './invoice-detail-component.css',
})
export class InvoiceDetailComponent {
  @Input() visible = false;
  @Input() invoice: Invoice | null = null;
  @Input() payments: Payment[] = [];
  @Input() paymentTotal = 0;
  @Input() loading = false;
  @Input() canManage = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() record = new EventEmitter<void>();
  statusSeverity(status: PaymentStatus): 'success' | 'warn' | 'secondary' {
    return ({ unpaid: 'secondary', partial: 'warn', paid: 'success' } as const)[status];
  }
}
