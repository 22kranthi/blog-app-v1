import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BlogList } from '../blog-list/blog-list';

@Component({
  selector: 'app-my-blogs',
  standalone: true,
  imports: [CommonModule, BlogList],
  template: `
    <div class="my-blogs-container" style="padding-top: 2rem;">
      <h1 style="text-align: center; margin-bottom: 2rem;">My Published Blogs</h1>
      <app-blog-list mode="my-blogs"></app-blog-list>
    </div>
  `
})
export class MyBlogs {}
