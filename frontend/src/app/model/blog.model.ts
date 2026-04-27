export interface Blog {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  category: string;
  content: string;
  imageUrl?: string;
  status?: string;
  summary_ai?: string;
  createdAt?: string;
}

// GraphQL Specific Response Types
export interface GraphQLResponse<T> {
  data: T;
  errors?: any[];
}

export interface ListBlogsResponse {
  listBlogs: Blog[];
}

export interface ListBlogsByCategoryResponse {
  listBlogsByCategory: Blog[];
}

export interface GetBlogResponse {
  getBlog: Blog;
}

export interface CreateBlogResponse {
  createBlog: Blog;
}

export interface UpdateBlogResponse {
  updateBlog: Blog;
}

export interface DeleteBlogResponse {
  deleteBlog: boolean;
}

export interface GetUploadUrlResponse {
  getUploadUrl: string;
}