import { Component, OnInit, inject, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { addBlog, addBlogSuccess, updateBlog, loadBlogs } from '../store/blog.action';
import { getAllBlogs } from '../store/blog.selector';
import { Actions, ofType } from '@ngrx/effects';
import { take, Subscription, firstValueFrom } from 'rxjs';
import { AuthService } from '../auth.service';
import { BlogService } from '../blog.service';
import { NotificationService } from '../notification.service';

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
  existingBlog: any = null;
  imagePreview: string | null = null;
  selectedFile: File | null = null;

  authService = inject(AuthService);
  blogService = inject(BlogService);
  private actions$ = inject(Actions);
  private subscription = new Subscription();
  isBrowser: boolean;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.editId = id;
        this.store.select(getAllBlogs).pipe(take(1)).subscribe(blogs => {
          const blog = blogs.find(b => b.id === id);
          if (blog) {
            this.existingBlog = blog;
            this.title = blog.title;
            this.category = blog.category || '';
            this.content = blog.content;
            this.imagePreview = blog.imageUrl || null;
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

  isDragging = false;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  handleFile(file: File) {
    if (this.isBrowser) {
      if (file.size > 5 * 1024 * 1024) {
        this.notificationService.error("File is too large! Maximum 5MB allowed.");
        return;
      }
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  notificationService = inject(NotificationService);

  async save() {
    if (!this.title.trim() || !this.category.trim() || !this.content.trim()) {
      this.notificationService.error("Please fill all the text fields! 📝");
      return;
    }

    if (!this.selectedFile && !this.imagePreview) {
      this.notificationService.error("Please upload a cover image! 📸");
      return;
    }

    this.isSubmitting = true;

    try {
      let imageUrl = this.existingBlog?.imageUrl;

      if (this.selectedFile) {
        // 1. Get upload URL
        const uploadUrl = await firstValueFrom(this.blogService.getUploadUrl(this.selectedFile.name, this.selectedFile.type));
        // 2. Upload to S3
        await firstValueFrom(this.blogService.uploadFile(uploadUrl, this.selectedFile));
        // 3. Extract public URL (remove query params)
        imageUrl = uploadUrl.split('?')[0];
      }

      if (this.editId) {
        if (!this.authService.isAdmin() && this.authService.currentUserId() !== this.existingBlog?.authorId) {
          alert("You do not have permission to edit this blog!");
          this.isSubmitting = false;
          return;
        }

        this.store.dispatch(updateBlog({
          id: this.editId,
          title: this.title,
          category: this.category,
          content: this.content,
          imageUrl: imageUrl,
          authorName: this.authService.userDisplayName() || undefined
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
          content: this.content,
          imageUrl: imageUrl,
          authorName: this.authService.userDisplayName() || undefined
        }));
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to process request. Please try again.");
      this.isSubmitting = false;
    }
  }
}