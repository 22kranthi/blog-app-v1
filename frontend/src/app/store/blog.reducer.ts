import { Blog } from "../model/blog.model";
import { addBlog, addBlogSuccess, deleteBlog, loadBlogs, loadBlogsSuccess, loadBlogsFailure, updateBlog, filterBlogsByCategorySuccess, loadMoreBlogs, loadMoreBlogsSuccess } from "./blog.action";
import { createReducer, on } from "@ngrx/store";

export interface BlogState {
  allBlogs: Blog[];
  filteredBlogs: Blog[];
  selectedCategory: string | null;
  nextToken: string | null;
  loading: boolean;
}

export const initialState: BlogState = {
  allBlogs: [],
  filteredBlogs: [],
  selectedCategory: null,
  nextToken: null,
  loading: false
};

export const blogReducer = createReducer(
  initialState,

  on(loadBlogs, (state) => ({
    ...state,
    loading: true
  })),

  on(loadBlogsSuccess, (state, { connection }) => ({
    ...state,
    allBlogs: connection.items,
    filteredBlogs: connection.items,
    nextToken: connection.nextToken,
    selectedCategory: null,
    loading: false
  })),

  on(loadMoreBlogs, (state) => ({
    ...state,
    loading: true
  })),

  on(loadMoreBlogsSuccess, (state, { connection }) => ({
    ...state,
    allBlogs: [...state.allBlogs, ...connection.items],
    filteredBlogs: state.selectedCategory === null 
      ? [...state.filteredBlogs, ...connection.items] 
      : state.filteredBlogs,
    nextToken: connection.nextToken,
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

  on(updateBlog, (state, { id, title, categories, content, authorName }) => {
    const updatedAllBlogs = state.allBlogs.map(b => b.id === id ? { ...b, title, categories, content, authorName: authorName || b.authorName } : b);
    const updatedFiltered = state.filteredBlogs.map(b => b.id === id ? { ...b, title, categories, content, authorName: authorName || b.authorName } : b);
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

