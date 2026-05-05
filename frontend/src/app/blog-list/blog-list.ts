import { Component, inject, OnInit, Input, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
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
export class BlogList implements OnInit, AfterViewInit, OnDestroy {
  mode: 'public' | 'my-blogs' | 'admin' = 'public';
  private routeSub?: Subscription;

  authService = inject(AuthService);
  blogList: Observable<Blog[]>;
  categories$: Observable<string[]>;
  loading$: Observable<boolean>;
  nextToken$: Observable<string | null>;
  activeCategory: string | null = null;
  hasBlogs$: Observable<boolean>;
  isAdmin$: Observable<boolean>;
  currentUserId$: Observable<string | null>;
  indicatorStyle = { transform: 'translateX(4px)', width: '48px', opacity: '1' };

  constructor(
    private store: Store, 
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loading$ = this.store.select(getLoading);
    this.nextToken$ = this.store.select(getNextToken);
    this.isAdmin$ = toObservable(this.authService.isAdmin);
    this.currentUserId$ = toObservable(this.authService.currentUserId);
    this.hasBlogs$ = this.store.select(getAllBlogsUnfiltered).pipe(map(blogs => (blogs?.length || 0) > 0));
    
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
    this.routeSub = this.route.url.subscribe(segments => {
      const path = segments[0]?.path;
      if (path === 'my-blogs') this.mode = 'my-blogs';
      else if (path === 'admin') this.mode = 'admin';
      else this.mode = 'public';
      
      const limit = this.mode === 'public' ? 3 : 50;
      this.store.dispatch(loadBlogs({ limit }));
    });
  }

  ngAfterViewInit() {
    // Initial indicator position for "All"
    setTimeout(() => this.resetIndicator(), 500);
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
  }

  filterByCategory(category: string | null, event?: Event) {
    this.activeCategory = category;
    
    if (event) {
      const el = event.currentTarget as HTMLElement;
      this.updateIndicator(el);
    }

    if (category === null) {
      const limit = this.mode === 'public' ? 3 : 50;
      this.store.dispatch(loadBlogs({ limit }));
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
    // Retry finding the button if it's not yet in the DOM or not rendered
    const tryReset = (attempts = 0) => {
      const allBtn = document.querySelector('.filter-btn.active') as HTMLElement;
      if (allBtn && allBtn.offsetWidth > 0) {
        this.updateIndicator(allBtn);
      } else if (attempts < 10) {
        setTimeout(() => tryReset(attempts + 1), 100);
      }
    };
    tryReset();
  }

  loadMore() {
    this.store.dispatch(loadMoreBlogs({ limit: 3 }));
  }

  edit(id: string) {
    this.router.navigate(['/edit', id]);
  }

  remove(id: string) {
    if (confirm('Are you sure you want to delete this blog?')) {
      this.store.dispatch(deleteBlog({ id }));
    }
  }

  canEdit(blog: Blog): boolean {
    if (this.mode === 'public') return false;
    if (this.authService.isAdmin()) return true;
    if (this.mode === 'my-blogs' && this.authService.currentUserId() === blog.authorId) return true;
    if (this.mode === 'admin') return true;
    return false;
  }

  trackById(_index: number, blog: { id: string }) {
    return blog.id;
  }
}
