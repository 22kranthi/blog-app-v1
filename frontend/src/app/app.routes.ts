import { Routes } from '@angular/router';
import { BlogList } from './blog-list/blog-list';
import { BlogForm } from './blog-form/blog-form';
import { BlogDetail } from './blog-detail/blog-detail';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { MyBlogs } from './my-blogs/my-blogs';
import { authGuard, adminGuard } from './auth.guard';
import { NotFoundComponent } from './not-found.component';

export const routes: Routes = [
  { path: '', component: BlogList },
  { path: 'my-blogs', component: MyBlogs, canActivate: [authGuard] },
  { path: 'add', component: BlogForm, canActivate: [authGuard] },
  { path: 'edit/:id', component: BlogForm, canActivate: [authGuard] },
  { path: 'blog/:id', component: BlogDetail },
  { path: 'admin', component: AdminDashboard, canActivate: [adminGuard] },
  { path: '**', component: NotFoundComponent }
];
