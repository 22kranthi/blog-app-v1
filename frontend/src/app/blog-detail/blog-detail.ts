import { Component, DestroyRef, inject, OnInit, HostListener } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { getAllBlogsUnfiltered, getLoading } from '../store/blog.selector';
import { loadBlogs } from '../store/blog.action';
import { take, Observable } from 'rxjs';
import { BlogService } from '../blog.service';
import { NotificationService } from '../notification.service';
import { Title } from '@angular/platform-browser';

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
  scrollPercent = 0;
  showBackToTop = false;
  copied = false;

  private destroyRef = inject(DestroyRef);
  private blogService = inject(BlogService);
  private notificationService = inject(NotificationService);
  private titleService = inject(Title);

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.loading$ = this.store.select(getLoading);
  }

  ngOnInit() {
    // If blogs aren't loaded yet (e.g. direct link), load them
    this.store.select(getAllBlogsUnfiltered).pipe(take(1)).subscribe(blogs => {
      if (blogs.length === 0) {
        this.store.dispatch(loadBlogs({}));
      }
    });

    this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        return this.store.select(getAllBlogsUnfiltered).pipe(
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
      if (blog) {
        this.titleService.setTitle(`${blog.title} — Modern Source`);
      }

      // If blog not found in store after loading, fetch directly from API
      if (!blog && hasLoaded) {
        this.blogService.getBlog(id).subscribe(fetched => {
          this.blog = fetched;
          if (fetched) {
            this.titleService.setTitle(`${fetched.title} — Modern Source`);
          } else {
            this.router.navigate(['/']);
          }
        });
      }
    });
  }

  getReadingTime(content: string): number {
    if (!content) return 0;
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }

  get paragraphs(): string[] {
    if (!this.blog?.content) return [];
    return this.blog.content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  }

  hasBeenUpdated(blog: Blog): boolean {
    if (!blog.updatedAt || !blog.createdAt) return false;
    // Compare dates (ignoring tiny millisecond differences if any)
    const created = new Date(blog.createdAt).getTime();
    const updated = new Date(blog.updatedAt).getTime();
    return Math.abs(updated - created) > 1000; // More than 1 second difference
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollHeight > 0) {
      this.scrollPercent = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
    } else {
      this.scrollPercent = 0;
    }

    this.showBackToTop = scrollTop > 300;
  }

  copyLink() {
    if (this.copied) return;
    
    const url = window.location.href;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        this.handleCopySuccess();
      }).catch(err => {
        console.error('Failed to copy link via Clipboard API:', err);
        this.fallbackCopy(url);
      });
    } else {
      this.fallbackCopy(url);
    }
  }

  private fallbackCopy(text: string) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.handleCopySuccess();
    } catch (e) {
      console.error('Fallback copy failed:', e);
      this.notificationService.error('Failed to copy link.');
    }
  }

  private handleCopySuccess() {
    this.copied = true;
    this.notificationService.success('Link copied to clipboard! 📋');
    setTimeout(() => {
      this.copied = false;
    }, 2000);
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
    // Fallback for older mobile browsers that might interrupt smooth scroll
    setTimeout(() => {
      if (window.scrollY > 100) {
        window.scrollTo(0, 0);
      }
    }, 800);
  }
}
