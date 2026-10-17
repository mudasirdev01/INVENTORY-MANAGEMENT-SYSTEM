import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Employee,
  EmployeeCreatePayload,
  EmployeeUpdatePayload,
} from '../interfaces/employee.interface';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/auth/users`;

  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.baseUrl}/`);
  }

  createEmployee(payload: EmployeeCreatePayload): Observable<Employee> {
    return this.http.post<Employee>(`${this.baseUrl}/`, payload);
  }

  updateEmployee(id: number, payload: EmployeeUpdatePayload): Observable<Employee> {
    return this.http.patch<Employee>(`${this.baseUrl}/${id}/`, payload);
  }
}
