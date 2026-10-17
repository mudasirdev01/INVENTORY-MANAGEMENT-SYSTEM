import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { StockOverview } from '../../../core/interfaces/inventory.interface';
import { InventoryService } from '../../../core/services/inventory-service';
@Component({
  selector: 'app-stock-settings-component',
  standalone: true,
  imports: [Button, Dialog, FormsModule, InputNumber],
  templateUrl: './stock-settings-component.html',
  styleUrl: './stock-settings-component.css',
})
export class StockSettingsComponent implements OnChanges {
  private service = inject(InventoryService);
  @Input() visible = false;
  @Input() product: StockOverview | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() changed = new EventEmitter<void>();
  saving = signal(false);
  error = signal('');
  reserved_quantity = 0;
  reorder_level = 0;
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] && this.product) {
      this.reserved_quantity = this.product.reserved_quantity;
      this.reorder_level = this.product.reorder_level;
      this.error.set('');
    }
  }
  close(): void {
    if (!this.saving()) this.visibleChange.emit(false);
  }
  save(): void {
    if (!this.product || this.reserved_quantity < 0 || this.reorder_level < 0) {
      this.error.set('Values cannot be negative.');
      return;
    }
    if (this.reserved_quantity > this.product.physical_quantity) {
      this.error.set('Reserved quantity cannot exceed physical quantity.');
      return;
    }
    this.saving.set(true);
    this.service
      .updateStockSettings(this.product.id, {
        reserved_quantity: this.reserved_quantity,
        reorder_level: this.reorder_level,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => this.changed.emit(),
        error: (e) => this.error.set(this.apiError(e)),
      });
  }
  private apiError(error: HttpErrorResponse): string {
    const body = error.error as Record<string, string | string[]> | undefined;
    const first = body ? Object.values(body)[0] : null;
    return first ? (Array.isArray(first) ? first[0] : first) : 'Unable to update stock settings.';
  }
}
