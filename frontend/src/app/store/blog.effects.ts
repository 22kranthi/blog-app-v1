import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { BlogService } from '../blog.service';
import { loadBlogs, loadBlogsSuccess, loadBlogsFailure, addBlog, addBlogSuccess, deleteBlog, updateBlog, filterBlogsByCategory, filterBlogsByCategorySuccess, loadMoreBlogs, loadMoreBlogsSuccess } from './blog.action';
import { switchMap, map, catchError, withLatestFrom } from 'rxjs';
import { of } from 'rxjs';
import { NotificationService } from '../notification.service';
import { getNextToken, getSelectedCategory, getCurrentLimit, getSelectedAuthorId } from './blog.selector';

@Injectable()
export class BlogEffects {

  private actions$ = inject(Actions);
  private blogService = inject(BlogService);
  private store = inject(Store);
  private notification = inject(NotificationService);
  
  loadBlogs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadBlogs),
      switchMap(({ limit, authorId }) =>
        this.blogService.getBlogs(limit || 6, null, authorId).pipe(
          map(connection => loadBlogsSuccess({ connection })),
          catchError(error => {
            this.notification.error('Failed to load blogs.');
            return of(loadBlogsFailure({ error }));
          })
        )
      )
    )
  );

  loadMoreBlogs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMoreBlogs),
      withLatestFrom(
        this.store.select(getNextToken),
        this.store.select(getSelectedCategory),
        this.store.select(getSelectedAuthorId)
      ),
      switchMap(([{ limit }, nextToken, selectedCategory, selectedAuthorId]) => {
        const fetchLimit = limit || 6;
        let obs;
        
        if (selectedAuthorId) {
          obs = this.blogService.getBlogsByAuthor(selectedAuthorId, fetchLimit, nextToken);
        } else if (selectedCategory) {
          obs = this.blogService.getBlogsByCategory(selectedCategory, fetchLimit, nextToken);
        } else {
          obs = this.blogService.getBlogs(fetchLimit, nextToken);
        }
          
        return obs.pipe(
          map(connection => loadMoreBlogsSuccess({ connection })),
          catchError(error => {
            this.notification.error('Failed to load more blogs.');
            return of(loadBlogsFailure({ error }));
          })
        );
      })
    )
  );

  addBlog$ = createEffect(() =>
    this.actions$.pipe(
      ofType(addBlog),
      switchMap(({ title, categories, content, imageUrl, authorName }) =>
        this.blogService.createBlog({ title, categories, content, imageUrl, authorName }).pipe(
          map(blog => {
            this.notification.success('Blog published successfully!');
            return addBlogSuccess({ blog });
          }),
          catchError(err => {
            this.notification.error('Failed to publish blog.');
            return of({ type: '[Blog] Add Blog Failure' });
          })
        )
      )
    )
  );

  updateBlog$ = createEffect(() =>
    this.actions$.pipe(
      ofType(updateBlog),
      withLatestFrom(this.store.select(getCurrentLimit), this.store.select(getSelectedAuthorId)),
      switchMap(([{ id, title, categories, content, imageUrl, status, authorName }, limit, authorId]) =>
        this.blogService.updateBlog({ id, title, categories, content, imageUrl, status, authorName }).pipe(
          map(() => {
            this.notification.success('Blog updated successfully!');
            return loadBlogs({ limit, authorId: authorId || undefined });
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
      withLatestFrom(this.store.select(getCurrentLimit), this.store.select(getSelectedAuthorId)),
      switchMap(([action, limit, authorId]) =>
        this.blogService.deleteBlog(action.id).pipe(
          map(() => {
            this.notification.success('Blog deleted.');
            return loadBlogs({ limit, authorId: authorId || undefined });
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
          return of(filterBlogsByCategorySuccess({ connection: { items: [], nextToken: null } }));
        }
        return this.blogService.getBlogsByCategory(category, 6).pipe(
          map(connection => filterBlogsByCategorySuccess({ connection })),
          catchError(err => {
            console.error('Failed to filter blogs by category:', err);
            return of(filterBlogsByCategorySuccess({ connection: { items: [], nextToken: null } }));
          })
        );
      })
    )
  );
}
