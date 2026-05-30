import { Component, OnInit, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, map, combineLatest } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { getAllBlogsUnfiltered, getLoading } from '../store/blog.selector';
import { loadBlogs } from '../store/blog.action';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-overview.html',
  styleUrl: './admin-overview.css'
})
export class AdminOverview implements OnInit {
  private store = inject(Store);

  blogs$: Observable<any[]> = this.store.select(getAllBlogsUnfiltered);
  loading$: Observable<boolean> = this.store.select(getLoading);

  // Derived stats
  totalPosts$: Observable<number> = this.blogs$.pipe(map(b => b.length));

  totalAuthors$: Observable<number> = this.blogs$.pipe(
    map(blogs => new Set(blogs.map(b => b.authorId)).size)
  );

  postsThisMonth$: Observable<number> = this.blogs$.pipe(
    map(blogs => {
      const now = new Date();
      return blogs.filter(b => {
        const created = new Date(b.createdAt);
        return created.getMonth() === now.getMonth() &&
               created.getFullYear() === now.getFullYear();
      }).length;
    })
  );

  aiSummaries$: Observable<number> = this.blogs$.pipe(
    map(blogs => blogs.filter(b => !!b.summary_ai).length)
  );

  recentPosts$: Observable<any[]> = this.blogs$.pipe(
    map(blogs =>
      [...blogs]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
    )
  );

  ngOnInit() {
    this.store.dispatch(loadBlogs({ limit: 100 }));
  }

  getReadingTime(content: string): number {
    if (!content) return 0;
    return Math.ceil(content.trim().split(/\s+/).length / 200);
  }
}
