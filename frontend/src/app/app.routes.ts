import { Routes } from '@angular/router';
import { BlogList } from './blog-list/blog-list';
import { BlogForm } from './blog-form/blog-form';
import { BlogDetail } from './blog-detail/blog-detail';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { authGuard, adminGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: BlogList },
  { path: 'add', component: BlogForm, canActivate: [authGuard] },
  { path: 'edit/:id', component: BlogForm, canActivate: [authGuard] },
  { path: 'blog/:id', component: BlogDetail },
  { path: 'admin', component: AdminDashboard, canActivate: [adminGuard] },
  { path: '**', redirectTo: '' }
];
