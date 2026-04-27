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
      <span class="icon">{{ n.type === 'success' ? '✅' : n.type === 'error' ? '❌' : 'ℹ️' }}</span>
      <span class="message">{{ n.message }}</span>
    </div>
  `,
  styles: [`
    .snackbar {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 50px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: white;
      font-weight: 500;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      z-index: 9999;
      cursor: pointer;
      animation: slide-up 0.3s ease-out;
      min-width: 300px;
      max-width: 90vw;
    }
    .success { background: #2ecc71; }
    .error { background: #e74c3c; }
    .info { background: #3498db; }
    
    @keyframes slide-up {
      from { transform: translate(-50%, 100%); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
  `]
})
export class NotificationComponent {
  notificationService = inject(NotificationService);
}
