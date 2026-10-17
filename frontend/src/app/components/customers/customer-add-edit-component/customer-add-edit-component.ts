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
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { Customer, CustomerPayload } from '../../../core/interfaces/customer.interface';
import { CustomerService } from '../../../core/services/customer-service';
interface CustomerForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_active: boolean;
}

@Component({
  selector: 'app-customer-add-edit-component',
  standalone: true,
  imports: [Button, Dialog, FormsModule, InputText, Select, Textarea],
  templateUrl: './customer-add-edit-component.html',
  styleUrl: './customer-add-edit-component.css',
})
export class CustomerAddEditComponent implements OnChanges {
  private service = inject(CustomerService);
  @Input() visible = false;
  @Input() customer: Customer | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<string>();
  saving = signal(false);
  formError = signal('');
  form: CustomerForm = this.emptyForm();
  readonly statusOptions = [
    { label: 'Active', value: true },
    { label: 'Inactive', value: false },
  ];
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customer'])
      this.form = this.customer
        ? {
            name: this.customer.name,
            email: this.customer.email ?? '',
            phone: this.customer.phone,
            address: this.customer.address,
            city: this.customer.city,
            state: this.customer.state,
            postal_code: this.customer.postal_code,
            country: this.customer.country,
            is_active: this.customer.is_active,
          }
        : this.emptyForm();
    if (changes['visible']?.currentValue) this.formError.set('');
  }
  close(): void {
    if (!this.saving()) this.visibleChange.emit(false);
  }
  save(): void {
    if (!this.form.name.trim()) {
      this.formError.set('Customer name is required.');
      return;
    }
    if (this.form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) {
      this.formError.set('Enter a valid email address.');
      return;
    }
    const payload: CustomerPayload = {
      name: this.form.name.trim(),
      email: this.form.email.trim() || null,
      phone: this.form.phone.trim(),
      address: this.form.address.trim(),
      city: this.form.city.trim(),
      state: this.form.state.trim(),
      postal_code: this.form.postal_code.trim(),
      country: this.form.country.trim(),
      is_active: this.form.is_active,
    };
    const request = this.customer
      ? this.service.updateCustomer(this.customer.id, payload)
      : this.service.createCustomer(payload);
    this.saving.set(true);
    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.saved.emit(this.customer ? 'Customer updated.' : 'Customer created.'),
      error: (error) => this.formError.set(this.apiError(error)),
    });
  }
  private emptyForm(): CustomerForm {
    return {
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: '',
      is_active: true,
    };
  }
  private apiError(error: HttpErrorResponse): string {
    const body = error.error as Record<string, string | string[]> | undefined;
    const first = body ? Object.values(body)[0] : null;
    return first ? (Array.isArray(first) ? first[0] : first) : 'Unable to save customer.';
  }
}
