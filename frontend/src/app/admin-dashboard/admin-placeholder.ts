import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-placeholder',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="placeholder-wrapper page-entrance">
      <div class="placeholder-content">
        <div class="placeholder-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z"/>
            <path d="M12 8v4l3 3"/>
          </svg>
        </div>
        <h2>Coming Soon</h2>
        <p>This section is under active development and will be available in the next milestone.</p>
      </div>
    </div>
  `,
  styles: [`
    .placeholder-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      padding: 40px;
    }
    .placeholder-content {
      text-align: center;
      max-width: 380px;
    }
    .placeholder-icon {
      width: 64px;
      height: 64px;
      background: #f0ede8;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      color: #1c1917;
    }
    .placeholder-icon svg { width: 30px; height: 30px; }
    h2 {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0 0 10px;
    }
    p {
      font-size: 14px;
      color: var(--text-tertiary);
      line-height: 1.6;
      margin: 0;
    }
  `]
})
export class AdminPlaceholder {}
