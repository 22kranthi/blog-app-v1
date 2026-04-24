
import { Blog } from "../model/blog.model";
import { addBlog, addBlogSuccess, deleteBlog, loadBlogsSuccess, updateBlog } from "./blog.action";
import { createReducer, on } from "@ngrx/store";

export const initialState: Blog[] = [];

export const blogReducer = createReducer(
  initialState,

  on(loadBlogsSuccess, (state, { blogs }) => blogs),

  on(addBlogSuccess, (state, { blog }) => [...state, blog]),

  on(updateBlog, (state, { id, title, category, content }) =>
    state.map(blog =>
      blog.id === id ? { ...blog, title, category, content } : blog
    )
  ),

  on(deleteBlog, (state, { id }) =>
    state.filter(blog => blog.id !== id)
  )
);

