import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InputText } from 'primeng/inputtext';
import { Paginator } from 'primeng/paginator';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Employee, EmployeeRole } from '../../../core/interfaces/employee.interface';
import { EmployeeService } from '../../../core/services/employee-service';
import { EmployeeAddEditComponent } from '../employee-add-edit-component/employee-add-edit-component';

@Component({
  selector: 'app-employee-list-component',
  standalone: true,
  imports: [
    Button,
    Card,
    DatePipe,
    EmployeeAddEditComponent,
    FormsModule,
    InputText,
    Paginator,
    Select,
    TableModule,
    Tag,
  ],
  templateUrl: './employee-list-component.html',
  styleUrl: './employee-list-component.css',
})
export class EmployeeListComponent implements OnInit {
  private service = inject(EmployeeService);
  private messages = inject(MessageService);
  private confirmation = inject(ConfirmationService);

  employees = signal<Employee[]>([]);
  visibleEmployees = signal<Employee[]>([]);
  loading = signal(true);
  dialogVisible = false;
  editingEmployee = signal<Employee | null>(null);
  totalRecords = signal(0);
  search = '';
  roleFilter: EmployeeRole | null = null;
  statusFilter: boolean | null = null;
  page = 1;
  pageSize = 10;

  readonly roleOptions = [
    { label: 'All roles', value: null },
    { label: 'Admin', value: 'admin' as EmployeeRole },
    { label: 'Inventory Manager', value: 'inventory_manager' as EmployeeRole },
    { label: 'Sales Executive', value: 'sales_executive' as EmployeeRole },
    { label: 'Accountant', value: 'accountant' as EmployeeRole },
  ];
  readonly statusOptions = [
    { label: 'All statuses', value: null },
    { label: 'Active', value: true },
    { label: 'Inactive', value: false },
  ];

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    this.loading.set(true);
    this.service
      .getEmployees()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (employees) => {
          this.employees.set(employees);
          this.applyFilters();
        },
        error: (error) => this.showError(this.apiError(error, 'Unable to load employees.')),
      });
  }

  applyFilters(): void {
    const query = this.search.trim().toLowerCase();
    const filtered = this.employees().filter((employee) => {
      const fullName = `${employee.first_name} ${employee.last_name}`.trim().toLowerCase();
      const matchesSearch =
        !query || fullName.includes(query) || employee.email.toLowerCase().includes(query);
      const matchesRole = this.roleFilter === null || employee.role === this.roleFilter;
      const matchesStatus = this.statusFilter === null || employee.is_active === this.statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });

    this.page = 1;
    this.totalRecords.set(filtered.length);
    this.visibleEmployees.set(filtered.slice(0, this.pageSize));
  }

  onPageChange(event: { first?: number; rows?: number }): void {
    this.pageSize = event.rows ?? this.pageSize;
    this.page = Math.floor((event.first ?? 0) / this.pageSize) + 1;
    const start = (this.page - 1) * this.pageSize;
    this.visibleEmployees.set(this.filteredEmployees().slice(start, start + this.pageSize));
  }

  openCreate(): void {
    this.editingEmployee.set(null);
    this.dialogVisible = true;
  }

  openEdit(employee: Employee): void {
    this.editingEmployee.set(employee);
    this.dialogVisible = true;
  }

  onEmployeeSaved(message: string): void {
    this.dialogVisible = false;
    this.showSuccess(message);
    this.loadEmployees();
  }

  confirmStatusChange(employee: Employee): void {
    const activate = !employee.is_active;
    const name = `${employee.first_name} ${employee.last_name}`.trim() || employee.email;
    this.confirmation.confirm({
      header: activate ? 'Activate employee?' : 'Deactivate employee?',
      message: activate ? `Allow ${name} to access the system again?` : `Deactivate ${name}?`,
      icon: activate ? 'pi pi-check-circle' : 'pi pi-exclamation-triangle',
      rejectLabel: 'Cancel',
      acceptLabel: activate ? 'Activate' : 'Deactivate',
      acceptButtonStyleClass: activate ? undefined : 'p-button-danger',
      accept: () => this.updateStatus(employee, activate),
    });
  }

  roleLabel(role: EmployeeRole): string {
    return this.roleOptions.find((option) => option.value === role)?.label ?? role;
  }

  private updateStatus(employee: Employee, isActive: boolean): void {
    this.service
      .updateEmployee(employee.id, {
        email: employee.email,
        first_name: employee.first_name,
        last_name: employee.last_name,
        role: employee.role,
        is_active: isActive,
      })
      .subscribe({
        next: () => {
          this.showSuccess(isActive ? 'Employee activated.' : 'Employee deactivated.');
          this.loadEmployees();
        },
        error: (error) => this.showError(this.apiError(error, 'Unable to update employee status.')),
      });
  }

  private filteredEmployees(): Employee[] {
    const query = this.search.trim().toLowerCase();
    return this.employees().filter((employee) => {
      const fullName = `${employee.first_name} ${employee.last_name}`.trim().toLowerCase();
      return (
        (!query || fullName.includes(query) || employee.email.toLowerCase().includes(query)) &&
        (this.roleFilter === null || employee.role === this.roleFilter) &&
        (this.statusFilter === null || employee.is_active === this.statusFilter)
      );
    });
  }

  private showSuccess(detail: string): void {
    this.messages.add({ severity: 'success', summary: 'Success', detail });
  }

  private showError(detail: string): void {
    this.messages.add({ severity: 'error', summary: 'Error', detail });
  }

  private apiError(error: HttpErrorResponse, fallback: string): string {
    const body = error.error as Record<string, string | string[]> | undefined;
    const first = body ? Object.values(body)[0] : null;
    return first ? (Array.isArray(first) ? first[0] : first) : fallback;
  }
}
