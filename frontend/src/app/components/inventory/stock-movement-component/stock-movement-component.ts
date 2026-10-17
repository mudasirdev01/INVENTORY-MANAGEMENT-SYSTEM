import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { ConfirmationService, MessageService } from 'primeng/api';
import { StockMovementPayload, StockOverview } from '../../../core/interfaces/inventory.interface';
import { InventoryService } from '../../../core/services/inventory-service';
@Component({
  selector: 'app-stock-movement-component',
  standalone: true,
  imports: [Button, Dialog, FormsModule, InputNumber, InputText, Textarea],
  templateUrl: './stock-movement-component.html',
  styleUrl: './stock-movement-component.css',
})
export class StockMovementComponent {
  private service = inject(InventoryService);
  private confirmation = inject(ConfirmationService);
  private messages = inject(MessageService);
  @Input() visible = false;
  @Input() type: 'IN' | 'OUT' = 'IN';
  @Input() product: StockOverview | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() changed = new EventEmitter<void>();
  saving = signal(false);
  error = signal('');
  quantity: number | null = null;
  reason = '';
  reference = '';
  close(): void {
    if (!this.saving()) this.visibleChange.emit(false);
  }
  save(): void {
    if (!this.product || !this.quantity || this.quantity < 1 || !this.reason.trim()) {
      this.error.set('Quantity must be at least 1 and reason is required.');
      return;
    }
    if (this.type === 'OUT') {
      this.confirmation.confirm({
        header: 'Confirm stock OUT',
        message: `Remove ${this.quantity} unit(s) from ${this.product.name}?`,
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'Cancel',
        acceptLabel: 'Confirm',
        acceptButtonStyleClass: 'p-button-danger',
        accept: () => this.submit(),
      });
      return;
    }
    this.submit();
  }
  private submit(): void {
    const payload: StockMovementPayload = {
      product: this.product!.id,
      quantity: this.quantity!,
      reason: this.reason.trim(),
      reference: this.reference.trim(),
    };
    const request =
      this.type === 'IN' ? this.service.stockIn(payload) : this.service.stockOut(payload);
    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary: 'Success',
          detail: this.type === 'IN' ? 'Stock added.' : 'Stock removed.',
        });
        this.reset();
        this.changed.emit();
      },
      error: (e) => this.error.set(this.apiError(e)),
    });
  }
  private reset(): void {
    this.quantity = null;
    this.reason = '';
    this.reference = '';
    this.error.set('');
  }
  private apiError(error: HttpErrorResponse): string {
    const body = error.error as Record<string, string | string[]> | undefined;
    const first = body ? Object.values(body)[0] : null;
    return first ? (Array.isArray(first) ? first[0] : first) : 'Unable to update stock.';
  }
}
