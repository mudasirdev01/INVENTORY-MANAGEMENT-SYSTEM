import { DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { Customer } from '../../../core/interfaces/customer.interface';
import { Product } from '../../../core/interfaces/product.interface';
import { OrderPayload, SalesOrder } from '../../../core/interfaces/order.interface';
import { OrderService } from '../../../core/services/order-service';
interface OrderLine {
  product: number | null;
  quantity: number | null;
}
@Component({
  selector: 'app-order-add-edit-component',
  standalone: true,
  imports: [Button, DecimalPipe, Dialog, FormsModule, InputNumber, Select],
  templateUrl: './order-add-edit-component.html',
  styleUrl: './order-add-edit-component.css',
})
export class OrderAddEditComponent {
  private service = inject(OrderService);
  @Input() visible = false;
  @Input() order: SalesOrder | null = null;
  @Input() customers: Customer[] = [];
  @Input() products: Product[] = [];
  @Input() customersLoading = false;
  @Input() productsLoading = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<string>();
  saving = signal(false);
  error = signal('');
  selectedCustomer: number | null = null;
  lines: OrderLine[] = [{ product: null, quantity: 1 }];
  ngOnChanges(): void {
    this.selectedCustomer = this.order?.customer ?? null;
    this.lines = this.order?.items.map((i) => ({ product: i.product, quantity: i.quantity })) ?? [
      { product: null, quantity: 1 },
    ];
    this.error.set('');
  }
  productFor(id: number | null): Product | undefined {
    return this.products.find((p) => p.id === id);
  }
  lineTotal(line: OrderLine): number {
    const p = this.productFor(line.product);
    return p && line.quantity ? Number(p.unit_price) * line.quantity : 0;
  }
  grandTotal(): number {
    return this.lines.reduce((sum, line) => sum + this.lineTotal(line), 0);
  }
  addLine(): void {
    this.lines.push({ product: null, quantity: 1 });
  }
  removeLine(index: number): void {
    if (this.lines.length > 1) this.lines.splice(index, 1);
  }
  close(): void {
    if (!this.saving()) this.visibleChange.emit(false);
  }
  save(): void {
    if (
      !this.selectedCustomer ||
      !this.lines.length ||
      this.lines.some((l) => !l.product || !l.quantity || l.quantity < 1)
    ) {
      this.error.set('Select a customer and valid product quantities.');
      return;
    }
    if (new Set(this.lines.map((l) => l.product)).size !== this.lines.length) {
      this.error.set('A product can appear only once per order.');
      return;
    }
    const payload: OrderPayload = {
      customer: this.selectedCustomer,
      items: this.lines.map((l) => ({ product: l.product!, quantity: l.quantity! })),
    };
    const request = this.order
      ? this.service.updateOrder(this.order.id, payload)
      : this.service.createOrder(payload);
    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) =>
        this.saved.emit(this.order ? 'Order updated.' : `Order ${saved.order_number} created.`),
      error: (e) => this.error.set(this.apiError(e)),
    });
  }
  private apiError(error: HttpErrorResponse): string {
    const body = error.error;
    if (typeof body === 'string') return body;
    const first =
      body && typeof body === 'object' ? Object.values(body as Record<string, unknown>)[0] : null;
    return Array.isArray(first) ? String(first[0]) : String(first || 'Unable to save order.');
  }
}
