import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="scene-wrapper">
      <div class="paper-shape paper-1"></div>
      <div class="paper-shape paper-2"></div>

      <div class="scene">
        <h1>404</h1>
        <p>Looks like this page drifted away.</p>
        <a routerLink="/" class="home-btn">Return to Home</a>
      </div>
    </div>
  `,
  styles: [`
    .scene-wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 80vh;
      overflow: hidden;
      background-color: transparent;
    }

    .scene {
      position: relative;
      z-index: 10;
      text-align: center;
    }

    h1 {
      font-family: 'Playfair Display', serif;
      font-size: 12rem;
      font-weight: 700;
      margin: 0;
      line-height: 1;
      color: var(--text-primary);
      animation: float-text 6s ease-in-out infinite;
    }

    p {
      font-size: 1.2rem;
      color: var(--text-secondary);
      margin-top: 20px;
      animation: fade-in-up 1s ease-out 0.5s both;
    }

    .paper-shape {
      position: absolute;
      background: #ffffff;
      border-radius: 4px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
      z-index: 1;
      opacity: 0.7;
    }

    .paper-1 {
      width: 200px;
      height: 250px;
      top: 10%;
      left: 15%;
      transform: rotate(-15deg);
      animation: float-paper 8s ease-in-out infinite;
    }

    .paper-2 {
      width: 150px;
      height: 200px;
      bottom: 10%;
      right: 15%;
      transform: rotate(25deg);
      animation: float-paper-alt 10s ease-in-out infinite reverse;
      background: #fdfbf7;
    }

    .home-btn {
      display: inline-block;
      margin-top: 30px;
      padding: 12px 28px;
      background: var(--text-primary);
      color: #fff;
      text-decoration: none;
      border-radius: 30px;
      font-weight: 500;
      transition: all 0.3s ease;
      animation: fade-in-up 1s ease-out 0.7s both, float-btn 4s ease-in-out infinite 1.7s;
    }

    .home-btn:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }

    @keyframes float-text {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-15px); }
    }

    @keyframes float-paper {
      0%, 100% { transform: translateY(0) rotate(-15deg); }
      50% { transform: translateY(-30px) rotate(-10deg); }
    }

    @keyframes float-paper-alt {
      0%, 100% { transform: translateY(0) rotate(25deg); }
      50% { transform: translateY(-25px) rotate(30deg); }
    }

    @keyframes float-btn {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @media (max-width: 768px) {
      h1 { font-size: 8rem; }
      .paper-1 { left: -10%; top: 5%; width: 120px; height: 150px; }
      .paper-2 { right: -5%; bottom: 15%; width: 100px; height: 130px; }
    }
  `]
})
export class NotFoundComponent {}
