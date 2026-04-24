import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  isAdmin = signal<boolean>(false);
  isAuthenticated = signal<boolean>(false);
  currentUserId = signal<string | null>(null);
  showLoginModal = signal<boolean>(false);

  router = inject(Router);

  constructor() {
    Hub.listen('auth', async (data) => {
      if (data.payload.event === 'signedIn') {
        await this.checkAuthStatus();
        this.showLoginModal.set(false); // Close the modal instantly
      } else if (data.payload.event === 'signedOut') {
        this.isAuthenticated.set(false);
        this.isAdmin.set(false);
        this.currentUserId.set(null);
      }
    });
  }

  async checkAuthStatus() {
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      this.isAuthenticated.set(!!user);
      this.currentUserId.set(user ? user.username : null);
      
      const groups = session.tokens?.accessToken?.payload['cognito:groups'] as string[];
      this.isAdmin.set(groups?.includes('ADMIN') || false);
    } catch (e) {
      this.isAuthenticated.set(false);
      this.isAdmin.set(false);
      this.currentUserId.set(null);
    }
  }

  login() {
    this.showLoginModal.set(true);
  }

  closeLogin() {
    this.showLoginModal.set(false);
  }

  async logout() {
    await signOut();
    this.isAuthenticated.set(false);
    this.isAdmin.set(false);
  }
}
