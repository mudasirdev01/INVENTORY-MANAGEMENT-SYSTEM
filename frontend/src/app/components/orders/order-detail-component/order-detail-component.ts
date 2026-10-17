import { DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { DisplayDatePipe } from '../../../core/common/date-format.pipe';
import { OrderStatus, SalesOrder } from '../../../core/interfaces/order.interface';
@Component({
  selector: 'app-order-detail-component',
  standalone: true,
  imports: [Button, DecimalPipe, Dialog, DisplayDatePipe, TableModule, Tag],
  templateUrl: './order-detail-component.html',
  styleUrl: './order-detail-component.css',
})
export class OrderDetailComponent {
  @Input() visible = false;
  @Input() order: SalesOrder | null = null;
  @Input() canManage = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() action = new EventEmitter<'confirm' | 'dispatch' | 'cancel'>();
  statusSeverity(status: OrderStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    return (
      ({ pending: 'warn', confirmed: 'info', dispatched: 'success', cancelled: 'danger' } as const)[
        status
      ] ?? 'secondary'
    );
  }
}
