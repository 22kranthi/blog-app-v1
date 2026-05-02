import { Component, inject, signal, OnInit, NgZone, ChangeDetectorRef } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { AuthService } from './auth.service';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';

import { NotificationComponent } from './notification.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, AmplifyAuthenticatorModule, NotificationComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  authService = inject(AuthService);
  authenticator = inject(AuthenticatorService);
  ngZone = inject(NgZone);
  cdr = inject(ChangeDetectorRef);
  protected readonly title = signal('blog-app');

  formFields = {
    signUp: {
      nickname: {
        label: 'Display Name (Author Name)',
        placeholder: 'Enter your display name',
        required: true,
        order: 1
      },
      email: {
        order: 2
      },
      password: {
        order: 3
      },
      confirm_password: {
        order: 4
      }
    }
  };

  ngOnInit() {
    this.authService.checkAuthStatus();
    
    // Fix for Amplify Authenticator dropping change detection events during Forgot Password
    this.authenticator.subscribe((authState) => {
      this.ngZone.run(() => {
        this.cdr.detectChanges();
      });
    });
  }
}

