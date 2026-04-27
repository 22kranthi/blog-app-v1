import { Injectable, inject } from '@angular/core';
import { from, map, Observable } from 'rxjs';
import { generateClient } from 'aws-amplify/api';
import { AuthService } from './auth.service';
import { 
  Blog, 
  GraphQLResponse, 
  ListBlogsResponse, 
  CreateBlogResponse, 
  UpdateBlogResponse, 
  DeleteBlogResponse, 
  GetUploadUrlResponse,  
  ListBlogsByCategoryResponse, 
  GetBlogResponse,
  BlogConnection
} from './model/blog.model';

@Injectable({ providedIn: 'root' })
export class BlogService {

  private authService = inject(AuthService);

  private getClient() {
    return generateClient();
  }

  private getAuthMode(): 'userPool' | 'apiKey' {
    return this.authService.isAuthenticated() ? 'userPool' : 'apiKey';
  }

  getBlogs(limit?: number, nextToken?: string | null): Observable<BlogConnection> {
    return from(this._getBlogs(limit, nextToken)).pipe(
      map(res => res.data?.listBlogs || { items: [], nextToken: null })
    );
  }

  private async _getBlogs(limit?: number, nextToken?: string | null): Promise<GraphQLResponse<ListBlogsResponse>> {
    return await this.getClient().graphql({
      query: `
        query ListBlogs($limit: Int, $nextToken: String) {
          listBlogs(limit: $limit, nextToken: $nextToken) {
            items {
              id title authorId authorName content category status imageUrl summary_ai createdAt
            }
            nextToken
          }
        }
      `,
      variables: { limit, nextToken },
      authMode: this.getAuthMode()
    }) as GraphQLResponse<ListBlogsResponse>;
  }

  createBlog(blog: Partial<Blog>): Observable<Blog> {
    return from(this._createBlog(blog)).pipe(
      map(res => res.data.createBlog)
    );
  }

  private async _createBlog(blog: Partial<Blog>): Promise<GraphQLResponse<CreateBlogResponse>> {
    return await this.getClient().graphql({
      query: `
        mutation($title: String!, $content: String!, $category: String!, $imageUrl: String, $authorName: String) {
          createBlog(title: $title, content: $content, category: $category, imageUrl: $imageUrl, authorName: $authorName) {
            id title authorId authorName content category status imageUrl summary_ai createdAt
          }
        }
      `,
      variables: blog,
      authMode: 'userPool'
    }) as GraphQLResponse<CreateBlogResponse>;
  }

  updateBlog(blog: Partial<Blog>): Observable<Blog> {
    return from(this._updateBlog(blog)).pipe(
      map(res => res.data.updateBlog)
    );
  }

  private async _updateBlog(blog: Partial<Blog>): Promise<GraphQLResponse<UpdateBlogResponse>> {
    return await this.getClient().graphql({
      query: `
        mutation($id: ID!, $title: String, $content: String, $category: String, $status: String, $imageUrl: String, $authorName: String) {
          updateBlog(id: $id, title: $title, content: $content, category: $category, status: $status, imageUrl: $imageUrl, authorName: $authorName) {
            id title authorId authorName content category status imageUrl summary_ai createdAt
          }
        }
      `,
      variables: blog,
      authMode: 'userPool'
    }) as GraphQLResponse<UpdateBlogResponse>;
  }

  deleteBlog(id: string): Observable<string> {
    return from(this._deleteBlog(id)).pipe(
      map(() => id)
    );
  }

  private async _deleteBlog(id: string): Promise<GraphQLResponse<DeleteBlogResponse>> {
    return await this.getClient().graphql({
      query: `
        mutation($id: ID!) {
          deleteBlog(id: $id)
        }
      `,
      variables: { id },
      authMode: 'userPool'
    }) as GraphQLResponse<DeleteBlogResponse>;
  }

  getUploadUrl(filename: string, contentType: string): Observable<string> {
    return from(this._getUploadUrl(filename, contentType)).pipe(
      map(res => res.data.getUploadUrl)
    );
  }

  private async _getUploadUrl(filename: string, contentType: string): Promise<GraphQLResponse<GetUploadUrlResponse>> {
    return await this.getClient().graphql({
      query: `
        mutation($filename: String!, $contentType: String!) {
          getUploadUrl(filename: $filename, contentType: $contentType)
        }
      `,
      variables: { filename, contentType },
      authMode: 'userPool'
    }) as GraphQLResponse<GetUploadUrlResponse>;
  }

  getBlogsByCategory(category: string): Observable<Blog[]> {
    return from(this._getBlogsByCategory(category)).pipe(
      map(res => res.data.listBlogsByCategory)
    );
  }

  private async _getBlogsByCategory(category: string): Promise<GraphQLResponse<ListBlogsByCategoryResponse>> {
    return await this.getClient().graphql({
      query: `
        query($category: String!) {
          listBlogsByCategory(category: $category) {
            id title authorId authorName content category status imageUrl summary_ai createdAt
          }
        }
      `,
      variables: { category },
      authMode: this.getAuthMode()
    }) as GraphQLResponse<ListBlogsByCategoryResponse>;
  }

  getBlog(id: string): Observable<Blog> {
    return from(this._getBlog(id)).pipe(
      map(res => res.data.getBlog)
    );
  }

  private async _getBlog(id: string): Promise<GraphQLResponse<GetBlogResponse>> {
    return await this.getClient().graphql({
      query: `
        query($id: ID!) {
          getBlog(id: $id) {
            id title authorId authorName content category status imageUrl summary_ai createdAt
          }
        }
      `,
      variables: { id },
      authMode: this.getAuthMode()
    }) as GraphQLResponse<GetBlogResponse>;
  }

  uploadFile(url: string, file: File): Observable<Response> {
    return from(fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    }));
  }
}
