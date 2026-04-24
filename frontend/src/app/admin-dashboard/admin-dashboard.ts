import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { getAllBlogs } from '../store/blog.selector';
import { loadBlogs, deleteBlog } from '../store/blog.action';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-container" style="padding: 2rem; max-width: 1000px; margin: 0 auto;">
      <h2 style="margin-bottom: 2rem; display: flex; align-items: center; gap: 10px;">
        🛡️ Admin Dashboard 
        <span style="font-size: 0.9rem; background: #4f46e5; color: white; padding: 2px 8px; border-radius: 12px;">Active</span>
      </h2>
      
      @if (!authService.isAdmin()) {
        <div style="background: rgba(255,50,50,0.1); padding: 1rem; border-radius: 8px; border: 1px solid red; color: red;">
          Access Denied. You must be an administrator to view this page.
        </div>
      } @else {
        <div class="dashboard-stats" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
          <div style="background: var(--card-bg); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color);">
            <h3 style="color: var(--text-secondary); margin-bottom: 0.5rem; font-size: 0.9rem;">Total Blogs</h3>
            <p style="font-size: 2rem; font-weight: bold; margin: 0;">{{ (blogs$ | async)?.length || 0 }}</p>
          </div>
        </div>

        <h3 style="margin-bottom: 1rem;">All Published Content</h3>
        <div style="background: var(--card-bg); border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color);">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: rgba(0,0,0,0.02); border-bottom: 1px solid var(--border-color);">
                <th style="padding: 1rem;">Title</th>
                <th style="padding: 1rem;">Author ID</th>
                <th style="padding: 1rem;">Date</th>
                <th style="padding: 1rem;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (blog of (blogs$ | async); track blog.id) {
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 1rem;">
                    <strong>{{ blog.title }}</strong><br>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">ID: {{ blog.id }}</span>
                  </td>
                  <td style="padding: 1rem;">{{ blog.authorId }}</td>
                  <td style="padding: 1rem;">{{ blog.createdAt | date }}</td>
                  <td style="padding: 1rem;">
                    <button (click)="removeBlog(blog.id)" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class AdminDashboard implements OnInit {
  store = inject(Store);
  authService = inject(AuthService);
  blogs$: Observable<any[]>;

  constructor() {
    this.blogs$ = this.store.select(getAllBlogs);
  }

  ngOnInit() {
    this.store.dispatch(loadBlogs());
  }

  removeBlog(id: string) {
    if (confirm('Are you sure you want to permanently delete this blog?')) {
      this.store.dispatch(deleteBlog({ id }));
    }
  }
}
