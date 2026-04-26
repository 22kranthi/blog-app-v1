import { Injectable } from '@angular/core';
import { from, map } from 'rxjs';
import { generateClient } from 'aws-amplify/api';

@Injectable({ providedIn: 'root' })
export class BlogService {

  private getClient() {
    return generateClient();
  }

  getBlogs() {
    return from(this._getBlogs()).pipe(
      map((res: any) => res.data.listBlogs)
    );
  }

  private async _getBlogs() {
    return await this.getClient().graphql({
      query: `
        query {
          listBlogs {
            id
            title
            authorId
            content
            category
            status
            imageUrl
            summary_ai
            createdAt
          }
        }
      `,
      authMode: 'userPool'
    } as any);
  }

  createBlog(blog: any) {
    return from(this._createBlog(blog)).pipe(
      map((res: any) => res.data.createBlog)
    );
  }

  private async _createBlog(blog: any) {
    return await this.getClient().graphql({
      query: `
        mutation($title: String!, $content: String!, $category: String!, $imageUrl: String) {
          createBlog(title: $title, content: $content, category: $category, imageUrl: $imageUrl) {
            id title authorId content category status imageUrl summary_ai createdAt
          }
        }
      `,
      variables: blog,
      authMode: 'userPool'
    } as any);
  }

  updateBlog(blog: any) {
    return from(this._updateBlog(blog)).pipe(
      map((res: any) => res.data.updateBlog)
    );
  }

  private async _updateBlog(blog: any) {
    return await this.getClient().graphql({
      query: `
        mutation($id: ID!, $title: String, $content: String, $category: String, $status: String, $imageUrl: String) {
          updateBlog(id: $id, title: $title, content: $content, category: $category, status: $status, imageUrl: $imageUrl) {
            id title authorId content category status imageUrl summary_ai createdAt
          }
        }
      `,
      variables: blog,
      authMode: 'userPool'
    } as any);
  }

  deleteBlog(id: string) {
    return from(this._deleteBlog(id)).pipe(
      map(() => id)
    );
  }

  private async _deleteBlog(id: string) {
    return await this.getClient().graphql({
      query: `
        mutation($id: ID!) {
          deleteBlog(id: $id)
        }
      `,
      variables: { id },
      authMode: 'userPool'
    } as any);
  }

  getUploadUrl(filename: string, contentType: string) {
    return from(this._getUploadUrl(filename, contentType)).pipe(
      map((res: any) => res.data.getUploadUrl)
    );
  }

  private async _getUploadUrl(filename: string, contentType: string) {
    return await this.getClient().graphql({
      query: `
        mutation($filename: String!, $contentType: String!) {
          getUploadUrl(filename: $filename, contentType: $contentType)
        }
      `,
      variables: { filename, contentType },
      authMode: 'userPool'
    } as any);
  }

  getBlogsByCategory(category: string) {
    return from(this._getBlogsByCategory(category)).pipe(
      map((res: any) => res.data.listBlogsByCategory)
    );
  }

  private async _getBlogsByCategory(category: string) {
    return await this.getClient().graphql({
      query: `
        query($category: String!) {
          listBlogsByCategory(category: $category) {
            id
            title
            authorId
            content
            category
            status
            imageUrl
            summary_ai
            createdAt
          }
        }
      `,
      variables: { category },
      authMode: 'userPool'
    } as any);
  }

  uploadFile(url: string, file: File) {
    return from(fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    }));
  }
}
