import { Component, inject } from '@angular/core';
import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [AmplifyAuthenticatorModule],
  template: `
    <div class="login-page-container">
      <div class="login-card">
        <div class="login-header">
          <h1>Welcome Back</h1>
          <p>Sign in to start writing and managing your blogs.</p>
        </div>
        
        <amplify-authenticator>
          <ng-template amplifySlot="authenticated">
            <div class="success-card">
              <div class="success-icon">✅</div>
              <h2>Successfully Logged In!</h2>
              <p>You're all set to share your thoughts with the world.</p>
              <button class="btn-continue" (click)="goToHome()">
                View Blogs
              </button>
            </div>
          </ng-template>
        </amplify-authenticator>
      </div>
    </div>
  `,
  styles: [`
    .login-page-container {
      min-height: calc(100vh - 80px);
      display: flex;
      justify-content: center;
      align-items: center;
      background: linear-gradient(135deg, #f6f8fb 0%, #e9edf3 100%);
      padding: 2rem;
    }

    .login-card {
      width: 100%;
      max-width: 500px;
      animation: slideUp 0.5s ease-out;
    }

    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }

    .login-header h1 {
      font-size: 2rem;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 0.5rem;
    }

    .login-header p {
      color: #64748b;
      font-size: 1rem;
    }

    .success-card {
      text-align: center;
      padding: 3rem 2rem;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
    }

    .success-icon {
      font-size: 3rem;
      margin-bottom: 1.5rem;
    }

    .success-card h2 {
      color: #0f172a;
      margin-bottom: 0.75rem;
      font-size: 1.5rem;
    }

    .success-card p {
      color: #64748b;
      margin-bottom: 2rem;
    }

    .btn-continue {
      width: 100%;
      padding: 0.8rem;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-continue:hover {
      background: #4338ca;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Amplify Authenticator Customization */
    :host ::ng-deep {
      --amplify-colors-brand-primary-80: #4f46e5;
      --amplify-colors-brand-primary-90: #4338ca;
      --amplify-colors-brand-primary-100: #3730a3;
      --amplify-components-authenticator-router-box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      --amplify-components-authenticator-router-border-width: 1px;
      --amplify-components-authenticator-router-border-color: #e2e8f0;
      --amplify-components-authenticator-router-border-radius: 16px;
    }
  `]
})
export class Login {
  router = inject(Router);
  authService = inject(AuthService);

  async goToHome() {
    await this.authService.checkAuthStatus();
    this.router.navigate(['/']);
  }
}
