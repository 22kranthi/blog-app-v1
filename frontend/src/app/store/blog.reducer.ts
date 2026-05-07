import { Blog } from "../model/blog.model";
import { addBlog, addBlogSuccess, deleteBlog, loadBlogs, loadBlogsSuccess, loadBlogsFailure, updateBlog, filterBlogsByCategory, filterBlogsByCategorySuccess, loadMoreBlogs, loadMoreBlogsSuccess } from "./blog.action";
import { createReducer, on } from "@ngrx/store";

export interface BlogState {
  allBlogs: Blog[];
  filteredBlogs: Blog[];
  selectedCategory: string | null;
  nextToken: string | null;
  currentLimit: number;
  loading: boolean;
}

export const initialState: BlogState = {
  allBlogs: [],
  filteredBlogs: [],
  selectedCategory: null,
  nextToken: null,
  currentLimit: 3,
  loading: false
};

export const blogReducer = createReducer(
  initialState,

  on(loadBlogs, (state, { limit }) => {
    const isModeSwitch = limit !== undefined && limit !== state.currentLimit;
    return {
      ...state,
      allBlogs: isModeSwitch ? [] : state.allBlogs,
      filteredBlogs: isModeSwitch ? [] : state.filteredBlogs,
      nextToken: isModeSwitch ? null : state.nextToken,
      currentLimit: limit || state.currentLimit,
      loading: true
    };
  }),

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

  on(loadMoreBlogsSuccess, (state, { connection }) => {
    const isCategoryActive = !!state.selectedCategory;
    return {
      ...state,
      allBlogs: isCategoryActive ? state.allBlogs : [...state.allBlogs, ...connection.items],
      filteredBlogs: [...state.filteredBlogs, ...connection.items],
      nextToken: connection.nextToken,
      loading: false
    };
  }),

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

  on(filterBlogsByCategory, (state, { category }) => ({
    ...state,
    selectedCategory: category,
    loading: true
  })),

  on(filterBlogsByCategorySuccess, (state, { connection }) => ({
    ...state,
    filteredBlogs: connection.items,
    nextToken: connection.nextToken,
    loading: false
  }))
);

