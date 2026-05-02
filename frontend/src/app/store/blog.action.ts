import { createAction, props } from "@ngrx/store";
import { Blog, BlogConnection } from  "../model/blog.model";


export const loadBlogs = createAction('[Blog] Load Blogs');

export const loadBlogsSuccess = createAction(
  '[Blog] Load Blogs Success',
  props<{ connection: BlogConnection }>()
);

export const loadBlogsFailure = createAction(
  '[Blog] Load Blogs Failure',
  props<{ error: any }>()
);

export const loadMoreBlogs = createAction(
  '[Blog] Load More Blogs',
  props<{ limit?: number }>()
);

export const loadMoreBlogsSuccess = createAction(
  '[Blog] Load More Blogs Success',
  props<{ connection: BlogConnection }>()
);

export const addBlog = createAction(
  '[Blog] Add Blog',
  props<{ title: string; categories: string[]; content: string; imageUrl?: string; authorName?: string }>()
);

export const addBlogSuccess = createAction(
  '[Blog] Add Blog Success',
  props<{ blog: Blog }>()
);

export const updateBlog = createAction(
  '[Blog] Update Blog',
  props<{ id: string; title: string; categories: string[]; content: string; imageUrl?: string; status?: string; authorName?: string }>()
);

export const deleteBlog = createAction(
  '[Blog] Delete Blog',
  props<{ id: string }>()
);

export const filterBlogsByCategory = createAction(
  '[Blog] Filter By Category',
  props<{ category: string | null }>()
);

export const filterBlogsByCategorySuccess = createAction(
  '[Blog] Filter By Category Success',
  props<{ blogs: Blog[] }>()
);
