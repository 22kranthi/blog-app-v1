import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { getAllBlogs, getAllBlogsUnfiltered } from '../store/blog.selector';
import { deleteBlog, loadBlogs, filterBlogsByCategory } from '../store/blog.action';
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
  categories$: Observable<string[]>;

  constructor(private store: Store, private router: Router) {
    this.blogList = this.store.select(getAllBlogs);
    this.categories$ = this.store.select(getAllBlogsUnfiltered).pipe(
      map(blogs => {
        const cats = new Set(blogs.map((b: any) => b.category).filter(Boolean));
        return Array.from(cats).sort();
      })
    );
  }

  ngOnInit() {
    this.store.dispatch(loadBlogs());
  }

  filterByCategory(category: string | null) {
    if (category === null) {
      this.store.dispatch(loadBlogs());
    } else {
      this.store.dispatch(filterBlogsByCategory({ category }));
    }
  }

  edit(id: string) {
    this.router.navigate(['/edit', id]);
  }

  remove(id: string) {
    if (confirm('Are you sure you want to delete this blog?')) {
      this.store.dispatch(deleteBlog({ id }));
    }
  }

  trackById(_index: number, blog: { id: string }) {
    return blog.id;
  }
}
