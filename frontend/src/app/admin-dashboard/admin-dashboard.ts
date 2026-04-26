import { Component, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { getAllBlogs } from '../store/blog.selector';
import { loadBlogs, deleteBlog } from '../store/blog.action';
import { BlogList } from '../blog-list/blog-list';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, BlogList],
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
        <app-blog-list mode="admin"></app-blog-list>
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
