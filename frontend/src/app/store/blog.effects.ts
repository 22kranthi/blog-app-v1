import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { BlogService } from '../blog.service';
import { loadBlogs, loadBlogsSuccess, loadBlogsFailure, addBlog, addBlogSuccess, deleteBlog, updateBlog, filterBlogsByCategory, filterBlogsByCategorySuccess, loadMoreBlogs, loadMoreBlogsSuccess } from './blog.action';
import { switchMap, map, catchError, withLatestFrom } from 'rxjs';
import { of } from 'rxjs';
import { NotificationService } from '../notification.service';
import { getNextToken } from './blog.selector';

@Injectable()
export class BlogEffects {

  private actions$ = inject(Actions);
  private blogService = inject(BlogService);
  private store = inject(Store);
  private notification = inject(NotificationService);
  
  loadBlogs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadBlogs),
      switchMap(({ limit }) =>
        this.blogService.getBlogs(limit || 3).pipe(
          map(connection => loadBlogsSuccess({ connection })),
          catchError(error => {
            this.notification.error('Failed to load blogs. Please check your connection.');
            return of(loadBlogsFailure({ error }));
          })
        )
      )
    )
  );

  loadMoreBlogs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMoreBlogs),
      withLatestFrom(this.store.select(getNextToken)),
      switchMap(([{ limit }, nextToken]) =>
        this.blogService.getBlogs(limit || 5, nextToken).pipe(
          map(connection => loadMoreBlogsSuccess({ connection })),
          catchError(error => {
            this.notification.error('Failed to load more blogs.');
            return of(loadBlogsFailure({ error }));
          })
        )
      )
    )
  );

  addBlog$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addBlog),
      switchMap(({ title, categories, content, imageUrl, authorName }) =>
        this.blogService.createBlog({ title, categories, content, imageUrl, authorName }).pipe(
          map(blog => {
            this.notification.success('Blog published successfully! ✨');
            return addBlogSuccess({ blog });
          }),
          catchError(err => {
            this.notification.error('Failed to publish blog. Please try again.');
            return of({ type: '[Blog] Add Blog Failure' });
          })
        )
      )
    )
  );

  updateBlog$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateBlog),
      switchMap(({ id, title, categories, content, imageUrl, status, authorName }) =>
        this.blogService.updateBlog({ id, title, categories, content, imageUrl, status, authorName }).pipe(
          map(() => {
            this.notification.success('Blog updated successfully!');
            return loadBlogs({});
          }),
          catchError(err => {
            this.notification.error('Failed to update blog.');
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
          map(() => {
            this.notification.success('Blog deleted.');
            return loadBlogs({});
          }),
          catchError(err => {
            this.notification.error('Failed to delete blog.');
            return of({ type: '[Blog] Delete Blog Failure' });
          })
        )
      )
    )
  );

  filterBlogsByCategory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(filterBlogsByCategory),
      switchMap(({ category }) => {
        if (!category) {
          return of(filterBlogsByCategorySuccess({ blogs: [] }));
        }
        return this.blogService.getBlogsByCategory(category).pipe(
          map(blogs => filterBlogsByCategorySuccess({ blogs: blogs || [] })),
          catchError(err => {
            console.error('Failed to filter blogs by category:', err);
            return of(filterBlogsByCategorySuccess({ blogs: [] }));
          })
        );
      })
    )
  );
}
