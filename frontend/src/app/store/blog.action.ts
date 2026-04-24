import { createAction, props } from "@ngrx/store";
import { Blog } from  "../model/blog.model";


export const loadBlogs = createAction('[Blog] Load Blogs');

export const loadBlogsSuccess = createAction(
  '[Blog] Load Blogs Success',
  props<{ blogs: Blog[] }>()
);

export const addBlog = createAction(
  '[Blog] Add Blog',
  props<{ title: string; category: string; content: string }>()
);

export const addBlogSuccess = createAction(
  '[Blog] Add Blog Success',
  props<{ blog: Blog }>()
);

export const updateBlog = createAction(
  '[Blog] Update Blog',
  props<{ id: string; title: string; category: string; content: string }>()
);

export const deleteBlog = createAction(
  '[Blog] Delete Blog',
  props<{ id: string }>()
);
