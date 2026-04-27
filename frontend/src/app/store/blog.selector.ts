import { createFeatureSelector, createSelector } from "@ngrx/store";
import { Blog } from "../model/blog.model";
import { BlogState } from "./blog.reducer";

export const selectBlogState = createFeatureSelector<BlogState>('blogs');

export const getAllBlogs = createSelector(
  selectBlogState,
  (state: BlogState) => state.filteredBlogs
);

export const getAllBlogsUnfiltered = createSelector(
  selectBlogState,
  (state: BlogState) => state.allBlogs
);

export const getSelectedCategory = createSelector(
  selectBlogState,
  (state: BlogState) => state.selectedCategory
);

export const getLoading = createSelector(
  selectBlogState,
  (state: BlogState) => state.loading
);

export const getNextToken = createSelector(
  selectBlogState,
  (state: BlogState) => state.nextToken
);
