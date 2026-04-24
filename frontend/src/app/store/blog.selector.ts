import { createFeatureSelector, createSelector } from "@ngrx/store";
import { Blog } from "../model/blog.model";

export const selectBlogState = createFeatureSelector<Blog[]>('blogs');

export const getAllBlogs = createSelector(
    selectBlogState,
    (state)=>state

)
