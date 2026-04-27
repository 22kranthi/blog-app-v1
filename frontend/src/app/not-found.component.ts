import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="not-found-container">
      <h1>404</h1>
      <p>Oops! The page you're looking for doesn't exist.</p>
      <a routerLink="/" class="btn-primary">Back to Home</a>
    </div>
  `,
  styles: [`
    .not-found-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 70vh;
      text-align: center;
    }
    h1 { font-size: 8rem; color: #8a2be2; margin: 0; }
    p { font-size: 1.5rem; color: var(--text-secondary); margin-bottom: 2rem; }
  `]
})
export class NotFoundComponent {}
