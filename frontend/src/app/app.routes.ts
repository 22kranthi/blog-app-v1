import { Routes } from '@angular/router';
import { BlogList } from './blog-list/blog-list';
import { BlogForm } from './blog-form/blog-form';
import { BlogDetail } from './blog-detail/blog-detail';
import { AdminShell } from './admin-dashboard/admin-shell';
import { AdminOverview } from './admin-dashboard/admin-overview';
import { AdminContent } from './admin-dashboard/admin-content';
import { AdminPlaceholder } from './admin-dashboard/admin-placeholder';
import { MyBlogs } from './my-blogs/my-blogs';
import { authGuard, adminGuard } from './auth.guard';
import { NotFoundComponent } from './not-found.component';

export const routes: Routes = [
  { path: '', component: BlogList, title: 'Home — Modern Source' },
  { path: 'my-blogs', component: MyBlogs, canActivate: [authGuard], title: 'My Posts — Modern Source' },
  { path: 'add', component: BlogForm, canActivate: [authGuard], title: 'New Post — Modern Source' },
  { path: 'edit/:id', component: BlogForm, canActivate: [authGuard], title: 'Edit Post — Modern Source' },
  { path: 'blog/:id', component: BlogDetail },
  {
    path: 'admin',
    component: AdminShell,
    canActivate: [adminGuard],
    children: [
      { path: '', component: AdminOverview, title: 'Overview — Admin' },
      { path: 'content', component: AdminContent, title: 'Content — Admin' },
      { path: 'users', component: AdminPlaceholder, title: 'Users — Admin' },
      { path: 'analytics', component: AdminPlaceholder, title: 'Analytics — Admin' },
    ]
  },
  { path: '**', component: NotFoundComponent, title: '404 Not Found — Modern Source' }
];
