import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from './services/auth-service';
import { environment } from '../../environments/environment';

const SKIP_REFRESH = new HttpContextToken<boolean>(() => false);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isOurApi = req.url.startsWith(`${environment.apiUrl}/`);
  const isLoginRequest = req.url.endsWith('/auth/login/');
  const isRefreshRequest = req.url.endsWith('/auth/refresh/');

  if (!isOurApi || isLoginRequest || isRefreshRequest) {
    return next(req);
  }

  const token = authService.getAccessToken();

  if (!token) {
    return next(req);
  }

  const requestWithToken = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(requestWithToken).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || req.context.get(SKIP_REFRESH)) {
        return throwError(() => error);
      }

      return authService.refreshAccessToken().pipe(
        switchMap((newAccessToken) => {
          const retryRequest = req.clone({
            context: req.context.set(SKIP_REFRESH, true),
            setHeaders: {
              Authorization: `Bearer ${newAccessToken}`,
            },
          });

          return next(retryRequest);
        }),
        catchError((refreshError) => {
          authService.clearSession();
          router.navigate(['/login']);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
