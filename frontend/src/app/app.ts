import { Component, inject, signal, OnInit, NgZone, ChangeDetectorRef, HostListener } from '@angular/core';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
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
  isDropdownOpen = signal(false);
  mobileMenuOpen = signal(false);
  scrolled = signal(false);
  isAdminRoute = signal(false);
  private router = inject(Router);

  @HostListener('window:scroll')
  onWindowScroll() {
    if (typeof window !== 'undefined') {
      this.scrolled.set(window.scrollY > 10);
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (this.isDropdownOpen() && !target.closest('.admin-toggle-wrapper')) {
      this.isDropdownOpen.set(false);
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  get initials(): string {
    const name = this.authService.userDisplayName() || 'User';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  toggleDropdown() {
    this.isDropdownOpen.update(v => !v);
  }

  logout() {
    this.isDropdownOpen.set(false);
    this.mobileMenuOpen.set(false);
    this.authService.logout();
  }

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

    // Track if we're inside the /admin route shell — hides the top navbar
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.isAdminRoute.set((e.urlAfterRedirects as string).startsWith('/admin'));
    });

    // Fix for Amplify Authenticator dropping change detection events during Forgot Password
    this.authenticator.subscribe((authState) => {
      this.ngZone.run(() => {
        this.cdr.detectChanges();
      });
    });
  }
}

