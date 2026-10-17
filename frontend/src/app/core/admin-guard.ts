import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './services/auth-service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  return authService.getProfile().pipe(
    map((profile) =>
      profile.role === 'admin'
        ? true
        : router.createUrlTree(['/dashboard'])
    ),
    catchError(() => of(router.createUrlTree(['/dashboard'])))
  );
};
