import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BlogService } from '../blog.service';
import { loadBlogs, loadBlogsSuccess, addBlog, addBlogSuccess, deleteBlog, updateBlog } from './blog.action';
import { switchMap, map, catchError } from 'rxjs';
import { of } from 'rxjs';

@Injectable()
export class BlogEffects {

  private actions$ = inject(Actions);
  private blogService = inject(BlogService);
  
  loadBlogs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadBlogs),
      switchMap(() =>
        this.blogService.getBlogs().pipe(
          map(blogs => loadBlogsSuccess({ blogs: blogs || [] })),
          catchError(err => {
            console.error('Failed to load blogs:', err);
            return of(loadBlogsSuccess({ blogs: [] }));
          })
        )
      )
    )
  );

  addBlog$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addBlog),
      switchMap(({ title, category, content, imageUrl }) =>
        this.blogService.createBlog({ title, category, content, imageUrl }).pipe(
          map(blog => addBlogSuccess({ blog })),
          catchError(err => {
            console.error('Failed to create blog:', err);
            alert('Failed to create blog. Please try again.');
            return of({ type: '[Blog] Add Blog Failure' });
          })
        )
      )
    )
  );

  updateBlog$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateBlog),
      switchMap(({ id, title, category, content, imageUrl, status }) =>
        this.blogService.updateBlog({ id, title, category, content, imageUrl, status }).pipe(
          map(() => loadBlogs()),
          catchError(err => {
            console.error('Failed to update blog:', err);
            alert('Failed to update blog. Please try again.');
            return of({ type: '[Blog] Update Blog Failure' });
          })
        )
      )
    )
  );

  deleteBlog$ = createEffect(() =>
    this.actions$.pipe(
      ofType(deleteBlog),
      switchMap(action =>
        this.blogService.deleteBlog(action.id).pipe(
          map(() => loadBlogs()),
          catchError(err => {
            console.error('Failed to delete blog:', err);
            alert('Failed to delete blog. Please try again.');
            return of({ type: '[Blog] Delete Blog Failure' });
          })
        )
      )
    )
  );
}