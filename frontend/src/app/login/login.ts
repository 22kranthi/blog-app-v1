import { Component, inject } from '@angular/core';
import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [AmplifyAuthenticatorModule],
  template: `
    <div style="display: flex; justify-content: center; padding: 4rem;">
      <amplify-authenticator>
        <ng-template amplifySlot="authenticated">
          <div style="text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h2 style="margin-bottom: 1rem; color: #10b981;">✅ Successfully Logged In!</h2>
            <p style="margin-bottom: 2rem; color: #64748b;">You can now post and manage blogs.</p>
            <button (click)="goToHome()" style="padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer;">
              Continue to Dashboard
            </button>
          </div>
        </ng-template>
      </amplify-authenticator>
    </div>
  `
})
export class Login {
  router = inject(Router);
  authService = inject(AuthService);

  async goToHome() {
    await this.authService.checkAuthStatus();
    this.router.navigate(['/']);
  }
}
