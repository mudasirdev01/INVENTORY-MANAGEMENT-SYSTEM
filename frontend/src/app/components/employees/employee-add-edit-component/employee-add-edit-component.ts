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
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Select } from 'primeng/select';
import {
  Employee,
  EmployeeCreatePayload,
  EmployeeRole,
} from '../../../core/interfaces/employee.interface';
import { EmployeeService } from '../../../core/services/employee-service';

interface EmployeeForm {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: EmployeeRole;
  is_active: boolean;
}

@Component({
  selector: 'app-employee-add-edit-component',
  standalone: true,
  imports: [Button, Dialog, FormsModule, InputText, Password, Select],
  templateUrl: './employee-add-edit-component.html',
  styleUrl: './employee-add-edit-component.css',
})
export class EmployeeAddEditComponent implements OnChanges {
  private service = inject(EmployeeService);
  @Input() visible = false;
  @Input() employee: Employee | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<string>();

  saving = signal(false);
  formError = signal('');
  form: EmployeeForm = this.emptyForm();
  readonly roleOptions = [
    { label: 'Admin', value: 'admin' as EmployeeRole },
    { label: 'Inventory Manager', value: 'inventory_manager' as EmployeeRole },
    { label: 'Sales Executive', value: 'sales_executive' as EmployeeRole },
    { label: 'Accountant', value: 'accountant' as EmployeeRole },
  ];
  readonly statusOptions = [
    { label: 'Active', value: true },
    { label: 'Inactive', value: false },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employee']) {
      this.form = this.employee
        ? {
            email: this.employee.email,
            password: '',
            first_name: this.employee.first_name,
            last_name: this.employee.last_name,
            role: this.employee.role,
            is_active: this.employee.is_active,
          }
        : this.emptyForm();
    }
    if (changes['visible']?.currentValue) this.formError.set('');
  }

  close(): void {
    if (!this.saving()) this.visibleChange.emit(false);
  }

  save(): void {
    if (!this.isValid()) return;
    this.saving.set(true);

    const request = this.employee
      ? this.service.updateEmployee(this.employee.id, {
          email: this.form.email.trim(),
          first_name: this.form.first_name.trim(),
          last_name: this.form.last_name.trim(),
          role: this.form.role,
          is_active: this.form.is_active,
        })
      : this.service.createEmployee(this.createPayload());

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => this.saved.emit(this.employee ? 'Employee updated.' : 'Employee created.'),
      error: (error) => this.formError.set(this.apiError(error)),
    });
  }

  private isValid(): boolean {
    if (!this.form.first_name.trim() || !this.form.last_name.trim()) {
      this.formError.set('First name and last name are required.');
      return false;
    }
    if (!this.form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) {
      this.formError.set('Enter a valid email address.');
      return false;
    }
    if (!this.employee && this.form.password.length < 8) {
      this.formError.set('Password must contain at least 8 characters.');
      return false;
    }
    this.formError.set('');
    return true;
  }

  private createPayload(): EmployeeCreatePayload {
    return {
      email: this.form.email.trim(),
      password: this.form.password,
      first_name: this.form.first_name.trim(),
      last_name: this.form.last_name.trim(),
      role: this.form.role,
    };
  }

  private emptyForm(): EmployeeForm {
    return {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'sales_executive',
      is_active: true,
    };
  }

  private apiError(error: HttpErrorResponse): string {
    const body = error.error as Record<string, string | string[]> | undefined;
    const first = body ? Object.values(body)[0] : null;
    return first ? (Array.isArray(first) ? first[0] : first) : 'Unable to save employee.';
  }
}
