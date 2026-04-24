import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { addBlog, addBlogSuccess, updateBlog, loadBlogs } from '../store/blog.action';
import { getAllBlogs } from '../store/blog.selector';
import { Actions, ofType } from '@ngrx/effects';
import { take, Subscription } from 'rxjs';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-blog-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './blog-form.html',
  styleUrl: './blog-form.css'
})
export class BlogForm implements OnInit, OnDestroy {
  title: string = '';
  category: string = '';
  content: string = '';
  isSubmitting: boolean = false;

  editId: string | null = null;
  authService = inject(AuthService);
  private actions$ = inject(Actions);
  private subscription = new Subscription();

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.editId = id;
        this.store.select(getAllBlogs).pipe(take(1)).subscribe(blogs => {
          const blog = blogs.find(b => b.id === id);
          if (blog) {
            this.title = blog.title;
            this.category = blog.category || '';
            this.content = blog.content;
          }
        });
      }
    });

    // Listen for successful creation/update to navigate
    this.subscription.add(
      this.actions$.pipe(
        ofType(addBlogSuccess, loadBlogs) // loadBlogs is dispatched after updateBlog
      ).subscribe(() => {
        if (this.isSubmitting) {
          this.isSubmitting = false;
          this.router.navigate(['/']);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  save() {
    if (!this.title.trim() || !this.category.trim() || !this.content.trim()) {
      alert("Please fill all the fields");
      return;
    }

    this.isSubmitting = true;

    if (this.editId) {
      if (!this.authService.isAdmin() && (!this.authService.currentUserId())) {
        alert("You do not have permission to edit blogs!");
        this.isSubmitting = false;
        return;
      }

      this.store.dispatch(updateBlog({
        id: this.editId,
        title: this.title,
        category: this.category,
        content: this.content
      }));

    } else {
      if (!this.authService.isAuthenticated()) {
        alert("You must be logged in to post a blog.");
        this.isSubmitting = false;
        return;
      }
      this.store.dispatch(addBlog({
        title: this.title,
        category: this.category,
        content: this.content
      }));
    }
  }
}