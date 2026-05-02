import { Component, inject, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, combineLatest } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth.service';

import { Blog } from '../model/blog.model';
import { getAllBlogs, getAllBlogsUnfiltered, getLoading, getNextToken } from '../store/blog.selector';
import { deleteBlog, loadBlogs, filterBlogsByCategory, loadMoreBlogs } from '../store/blog.action';

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
  nextToken$: Observable<string | null>;
  activeCategory: string | null = null;
  hasBlogs$: Observable<boolean>;
  indicatorStyle = { transform: 'translateX(0px)', width: '0px', opacity: '0' };

  constructor(private store: Store, private router: Router) {
    this.loading$ = this.store.select(getLoading);
    this.nextToken$ = this.store.select(getNextToken);
    this.hasBlogs$ = this.store.select(getAllBlogsUnfiltered).pipe(map(blogs => blogs.length > 0));
    
    // Initialize indicator on next tick to ensure DOM is ready
    setTimeout(() => this.resetIndicator(), 500);
    
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
          .flatMap((b: Blog) => b.categories || [])
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

  filterByCategory(category: string | null, event?: Event) {
    this.activeCategory = category;
    
    if (event) {
      const el = event.currentTarget as HTMLElement;
      this.updateIndicator(el);
    }

    if (category === null) {
      this.store.dispatch(loadBlogs());
    } else {
      this.store.dispatch(filterBlogsByCategory({ category }));
    }
  }

  private updateIndicator(el: HTMLElement) {
    this.indicatorStyle = {
      transform: `translateX(${el.offsetLeft}px)`,
      width: `${el.offsetWidth}px`,
      opacity: '1'
    };
  }

  private resetIndicator() {
    const allBtn = document.querySelector('.filter-btn') as HTMLElement;
    if (allBtn) this.updateIndicator(allBtn);
  }

  loadMore() {
    this.store.dispatch(loadMoreBlogs({ limit: 5 }));
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
