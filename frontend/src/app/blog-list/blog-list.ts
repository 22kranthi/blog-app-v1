import { Component, inject, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, take } from 'rxjs/operators';
import { getAllBlogs, getAllBlogsUnfiltered, getLoading } from '../store/blog.selector';
import { deleteBlog, loadBlogs, filterBlogsByCategory } from '../store/blog.action';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';

import { Blog } from '../model/blog.model';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-list.html',
  styleUrl: './blog-list.css'
})
export class BlogList implements OnInit {
  @Input() mode: 'public' | 'my-blogs' | 'admin' = 'public';

  authService = inject(AuthService);
  blogList: Observable<Blog[]>;
  categories$: Observable<string[]>;
  loading$: Observable<boolean>;

  constructor(private store: Store, private router: Router) {
    this.loading$ = this.store.select(getLoading);
    
    // Select blogs based on mode and react to user changes
    this.blogList = combineLatest([
      this.store.select(getAllBlogs),
      this.store.select(getAllBlogsUnfiltered),
      toObservable(this.authService.currentUserId)
    ]).pipe(
      map(([filtered, all, userId]) => {
        const blogsToUse = this.mode === 'public' ? filtered : all;
        
        if (this.mode === 'my-blogs') {
          return blogsToUse.filter((b: Blog) => b.authorId === userId);
        }
        return blogsToUse;
      })
    );

    this.categories$ = this.store.select(getAllBlogsUnfiltered).pipe(
      map(blogs => {
        const normalizedCats = blogs
          .map((b: Blog) => b.category)
          .filter(Boolean)
          .map((cat: string) => {
            const trimmed = cat.trim();
            if (!trimmed) return '';
            return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
          })
          .filter(Boolean);
          
        const cats = new Set(normalizedCats);
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
