import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { getAllBlogs, getLoading } from '../store/blog.selector';
import { loadBlogs } from '../store/blog.action';
import { take, Observable } from 'rxjs';

import { Blog } from '../model/blog.model';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-detail.html',
  styleUrl: './blog-detail.css'
})
export class BlogDetail implements OnInit {
  blog: Blog | null = null;
  loading$: Observable<boolean>;

  private destroyRef = inject(DestroyRef);

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.loading$ = this.store.select(getLoading);
  }

  ngOnInit() {
    // If blogs aren't loaded yet (e.g. direct link), load them
    this.store.select(getAllBlogs).pipe(take(1)).subscribe(blogs => {
      if (blogs.length === 0) {
        this.store.dispatch(loadBlogs());
      }
    });

    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        return this.store.select(getAllBlogs).pipe(
          map(blogs => ({
            id,
            blog: id ? blogs.find(b => b.id === id) ?? null : null,
            hasLoaded: blogs.length > 0
          }))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ id, blog, hasLoaded }) => {
      if (!id) return;
      this.blog = blog;
      if (!blog && hasLoaded) {
        this.router.navigate(['/']);
      }
    });
  }

  getReadingTime(content: string): number {
    if (!content) return 0;
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }
}
