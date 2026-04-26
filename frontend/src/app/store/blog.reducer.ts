import { Blog } from "../model/blog.model";
import { addBlog, addBlogSuccess, deleteBlog, loadBlogs, loadBlogsSuccess, loadBlogsFailure, updateBlog, filterBlogsByCategorySuccess } from "./blog.action";
import { createReducer, on } from "@ngrx/store";

export interface BlogState {
  allBlogs: Blog[];
  filteredBlogs: Blog[];
  selectedCategory: string | null;
  loading: boolean;
}

export const initialState: BlogState = {
  allBlogs: [],
  filteredBlogs: [],
  selectedCategory: null,
  loading: false
};

export const blogReducer = createReducer(
  initialState,

  on(loadBlogs, (state) => ({
    ...state,
    loading: true
  })),

  on(loadBlogsSuccess, (state, { blogs }) => ({
    ...state,
    allBlogs: blogs,
    filteredBlogs: blogs,
    selectedCategory: null,
    loading: false
  })),

  on(loadBlogsFailure, (state) => ({
    ...state,
    loading: false
  })),

  on(addBlogSuccess, (state, { blog }) => ({
    ...state,
    allBlogs: [...state.allBlogs, blog],
    filteredBlogs: state.selectedCategory === null ? [...state.filteredBlogs, blog] : state.filteredBlogs
  })),

  on(updateBlog, (state, { id, title, category, content, authorName }) => {
    const updatedAllBlogs = state.allBlogs.map(b => b.id === id ? { ...b, title, category, content, authorName: authorName || b.authorName } : b);
    const updatedFiltered = state.filteredBlogs.map(b => b.id === id ? { ...b, title, category, content, authorName: authorName || b.authorName } : b);
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

