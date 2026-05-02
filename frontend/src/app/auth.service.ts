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
  userDisplayName = signal<string | null>(null);
  showLoginModal = signal<boolean>(false);
  redirectUrl: string | null = null;

  router = inject(Router);

  constructor() {
    Hub.listen('auth', async (data) => {
      if (data.payload.event === 'signedIn') {
        await this.checkAuthStatus();
        this.showLoginModal.set(false); // Close the modal instantly
        
        if (this.redirectUrl) {
          this.router.navigateByUrl(this.redirectUrl);
          this.redirectUrl = null;
        }
      } else if (data.payload.event === 'signedOut') {
        this.isAuthenticated.set(false);
        this.isAdmin.set(false);
        this.currentUserId.set(null);
        this.userDisplayName.set(null);
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

      // Fetch user attributes for display name
      const attributes = (await session.tokens?.idToken?.payload) as any;
      const nickname = attributes['nickname'];
      const email = attributes['email'];
      
      if (nickname) {
        this.userDisplayName.set(nickname);
      } else if (email) {
        this.userDisplayName.set(email.split('@')[0]); // Fallback to email prefix
      } else {
        this.userDisplayName.set(user.username);
      }

    } catch (e) {
      this.isAuthenticated.set(false);
      this.isAdmin.set(false);
      this.currentUserId.set(null);
      this.userDisplayName.set(null);
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
