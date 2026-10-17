import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, map, of, shareReplay, tap, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface UserProfile {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface LoginResponse {
  access: string;
  refresh: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/auth`;
  private refreshRequest$: Observable<string> | null = null;
  readonly profile = signal<UserProfile | null>(null);

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login/`, { email, password }).pipe(
      tap((response) => {
        sessionStorage.setItem('access_token', response.access);
        sessionStorage.setItem('refresh_token', response.refresh);
      }),
    );
  }

  getAccessToken(): string | null {
    return sessionStorage.getItem('access_token');
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken();
  }

  logout(): Observable<unknown> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.clearSession();
      return of(null);
    }

    return this.http
      .post(`${this.apiUrl}/logout/`, { refresh: refreshToken })
      .pipe(finalize(() => this.clearSession()));
  }

  clearSession(): void {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    this.profile.set(null);
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem('refresh_token');
  }

  refreshAccessToken(): Observable<string> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('Refresh token is missing.'));
    }

    if (!this.refreshRequest$) {
      this.refreshRequest$ = this.http
        .post<{ access: string }>(`${this.apiUrl}/refresh/`, { refresh: refreshToken })
        .pipe(
          tap((response) => {
            sessionStorage.setItem('access_token', response.access);
          }),
          map((response) => response.access),
          finalize(() => {
            this.refreshRequest$ = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }

    return this.refreshRequest$;
  }

  getProfile(): Observable<UserProfile> {
    return this.http
      .get<UserProfile>(`${this.apiUrl}/profile/`)
      .pipe(tap((profile) => this.profile.set(profile)));
  }
}
