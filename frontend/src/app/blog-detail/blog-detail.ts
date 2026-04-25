import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { getAllBlogs } from '../store/blog.selector';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './blog-detail.html',
  styleUrl: './blog-detail.css'
})
export class BlogDetail implements OnInit {
  blog: any = null;

  private destroyRef = inject(DestroyRef);

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
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
}
