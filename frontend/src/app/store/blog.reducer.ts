
import { Blog } from "../model/blog.model";
import { addBlog, addBlogSuccess, deleteBlog, loadBlogsSuccess, updateBlog, filterBlogsByCategorySuccess } from "./blog.action";
import { createReducer, on } from "@ngrx/store";

export interface BlogState {
  allBlogs: Blog[];
  filteredBlogs: Blog[];
  selectedCategory: string | null;
}

export const initialState: BlogState = {
  allBlogs: [],
  filteredBlogs: [],
  selectedCategory: null
};

export const blogReducer = createReducer(
  initialState,

  on(loadBlogsSuccess, (state, { blogs }) => ({
    ...state,
    allBlogs: blogs,
    filteredBlogs: blogs,
    selectedCategory: null
  })),

  on(addBlogSuccess, (state, { blog }) => ({
    ...state,
    allBlogs: [...state.allBlogs, blog],
    filteredBlogs: state.selectedCategory === null ? [...state.filteredBlogs, blog] : state.filteredBlogs
  })),

  on(updateBlog, (state, { id, title, category, content }) => {
    const updatedAllBlogs = state.allBlogs.map(b => b.id === id ? { ...b, title, category, content } : b);
    const updatedFiltered = state.filteredBlogs.map(b => b.id === id ? { ...b, title, category, content } : b);
    return {
      ...state,
      allBlogs: updatedAllBlogs,
      filteredBlogs: updatedFiltered
    };
  }),

  on(deleteBlog, (state, { id }) => ({
    ...state,
    allBlogs: state.allBlogs.filter(b => b.id !== id),
    filteredBlogs: state.filteredBlogs.filter(b => b.id !== id)
  })),

  on(filterBlogsByCategorySuccess, (state, { blogs }) => ({
    ...state,
    filteredBlogs: blogs
  }))
);

