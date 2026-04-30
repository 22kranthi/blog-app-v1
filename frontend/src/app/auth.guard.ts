import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If status unknown, check it
  if (!authService.isAuthenticated()) {
    await authService.checkAuthStatus();
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login if not authenticated
  router.navigate(['/login']);
  return false;
};

export const adminGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    await authService.checkAuthStatus();
  }

  if (!authService.isAdmin()) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};
