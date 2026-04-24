import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { getAllBlogs } from '../store/blog.selector';
import { deleteBlog, loadBlogs } from '../store/blog.action';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-list.html',
  styleUrl: './blog-list.css'
})
export class BlogList implements OnInit {
  authService = inject(AuthService);
  blogList: Observable<any>;

  constructor(private store: Store, private router: Router) {
    this.blogList = this.store.select(getAllBlogs);
  }

  ngOnInit() {
    this.store.dispatch(loadBlogs());  // 🔥 moved here
  }

  edit(id: string) {
    this.router.navigate(['/edit', id]);
  }

  remove(id: string) {
    if (confirm('Are you sure you want to delete this blog?')) {
      this.store.dispatch(deleteBlog({ id }));
    }
  }
}
