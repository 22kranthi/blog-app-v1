import { Routes } from '@angular/router';
import { BlogList } from './blog-list/blog-list';
import { BlogForm } from './blog-form/blog-form';
import { BlogDetail } from './blog-detail/blog-detail';
import { AdminDashboard } from './admin-dashboard/admin-dashboard';
import { MyBlogs } from './my-blogs/my-blogs';
import { authGuard, adminGuard } from './auth.guard';
import { NotFoundComponent } from './not-found.component';

export const routes: Routes = [
  { path: '', component: BlogList, title: 'Home — Modern Source' },
  { path: 'my-blogs', component: MyBlogs, canActivate: [authGuard], title: 'My Posts — Modern Source' },
  { path: 'add', component: BlogForm, canActivate: [authGuard], title: 'New Post — Modern Source' },
  { path: 'edit/:id', component: BlogForm, canActivate: [authGuard], title: 'Edit Post — Modern Source' },
  { path: 'blog/:id', component: BlogDetail }, // Title set dynamically in detail component
  { path: 'admin', component: AdminDashboard, canActivate: [adminGuard], title: 'Admin Dashboard — Modern Source' },
  { path: '**', component: NotFoundComponent, title: '404 Not Found — Modern Source' }
];
