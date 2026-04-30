import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from './notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="notificationService.notification() as n" 
         [class]="'snackbar ' + n.type"
         (click)="notificationService.notification.set(null)">
      
      <!-- Success Icon -->
      <svg *ngIf="n.type === 'success'" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      
      <!-- Error Icon -->
      <svg *ngIf="n.type === 'error'" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
      
      <!-- Info Icon -->
      <svg *ngIf="n.type === 'info'" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>

      <span class="message">{{ n.message }}</span>
      <div class="progress-bar"></div>
    </div>
  `,
  styles: [`
    .snackbar {
      position: fixed;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      padding: 16px 28px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 14px;
      color: #f8fafc;
      font-weight: 500;
      z-index: 9999;
      cursor: pointer;
      min-width: 380px;
      max-width: 90vw;
      background: #0f172a; /* Slate 900 */
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);
      animation: spring-up 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      overflow: hidden;
    }

    .icon {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }

    .success .icon { color: #10b981; } /* Emerald 500 */
    .success .progress-bar { background: #10b981; }

    .error .icon { color: #f43f5e; } /* Rose 500 */
    .error .progress-bar { background: #f43f5e; }

    .info .icon { color: #3b82f6; } /* Blue 500 */
    .info .progress-bar { background: #3b82f6; }

    .message {
      font-size: 0.95rem;
      line-height: 1.4;
    }

    .progress-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 100%;
      animation: progress 5s linear forwards;
      opacity: 0.8;
    }

    @keyframes spring-up {
      from { transform: translate(-50%, 100%) scale(0.8); opacity: 0; }
      to { transform: translate(-50%, 0) scale(1); opacity: 1; }
    }

    @keyframes progress {
      from { width: 100%; }
      to { width: 0%; }
    }
  `]
})
export class NotificationComponent {
  notificationService = inject(NotificationService);
}
