import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);

  // If status unknown, check it
  if (!authService.isAuthenticated()) {
    await authService.checkAuthStatus();
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  // Redirect to login modal if not authenticated, saving the URL they wanted
  authService.redirectUrl = state.url;
  authService.login();
  return false;
};

export const adminGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);

  if (!authService.isAuthenticated()) {
    await authService.checkAuthStatus();
  }

  if (!authService.isAdmin()) {
    authService.redirectUrl = state.url;
    authService.login();
    return false;
  }
  return true;
};
