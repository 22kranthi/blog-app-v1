import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.css'
})
export class AdminShell {
  constructor(public authService: AuthService) {}

  async logout() {
    await this.authService.logout();
  }
}
