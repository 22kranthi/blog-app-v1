import { Component, OnInit, inject, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { addBlog, addBlogSuccess, updateBlog, loadBlogs } from '../store/blog.action';
import { getAllBlogs } from '../store/blog.selector';
import { Actions, ofType } from '@ngrx/effects';
import { take, Subscription, firstValueFrom, Subject, debounceTime } from 'rxjs';
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
  categoriesArray: string[] = [];
  content: string = '';
  isSubmitting: boolean = false;

  // Dynamic Category Input
  showCategoryInput = false;
  newCategory = '';

  editId: string | null = null;
  existingBlog: any = null;
  imagePreview: string | null = null;
  selectedFile: File | null = null;

  // Auto-Save RxJS
  private formChanges$ = new Subject<void>();
  draftStatus: string = 'Draft saved automatically';

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
            this.categoriesArray = [...(blog.categories || [])];
            this.content = blog.content;
            this.imagePreview = blog.imageUrl || null;
            this.loadDraft(); // override with local draft if newer
          }
        });
      } else {
        this.loadDraft();
      }
    });

    this.subscription.add(
      this.actions$.pipe(
        ofType(addBlogSuccess, loadBlogs)
      ).subscribe(() => {
        if (this.isSubmitting) {
          this.isSubmitting = false;
          this.clearDraft();
          this.router.navigate(['/']);
        }
      })
    );

    // RxJS Debounced Auto-Save
    this.subscription.add(
      this.formChanges$.pipe(
        debounceTime(1500)
      ).subscribe(() => {
        this.saveDraft();
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  // --- Auto-Save Logic ---
  onFieldChange() {
    this.draftStatus = 'Saving...';
    this.formChanges$.next();
  }

  saveDraft() {
    if (this.isBrowser && (this.title || this.content || this.categoriesArray.length > 0)) {
      const draft = {
        title: this.title,
        content: this.content,
        categories: this.categoriesArray
      };
      const key = this.editId ? `draft_${this.editId}` : 'draft_new';
      localStorage.setItem(key, JSON.stringify(draft));
      this.draftStatus = 'Draft saved automatically';
    }
  }

  loadDraft() {
    if (this.isBrowser) {
      const key = this.editId ? `draft_${this.editId}` : 'draft_new';
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          if (draft.title) this.title = draft.title;
          if (draft.content) this.content = draft.content;
          if (draft.categories) this.categoriesArray = draft.categories;
        } catch (e) {}
      }
    }
  }

  clearDraft() {
    if (this.isBrowser) {
      const key = this.editId ? `draft_${this.editId}` : 'draft_new';
      localStorage.removeItem(key);
    }
  }

  // --- Dynamic Category Logic ---
  addCategory() {
    const cat = this.newCategory.trim();
    if (cat && !this.categoriesArray.includes(cat)) {
      this.categoriesArray.push(cat);
      this.onFieldChange();
    }
    this.newCategory = '';
    this.showCategoryInput = false;
  }

  removeCategory(index: number) {
    this.categoriesArray.splice(index, 1);
    this.onFieldChange();
  }

  // --- Drag and Drop Logic ---
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
      this.onFieldChange();
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.handleFile(file);
      this.onFieldChange();
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
    this.onFieldChange();
  }

  notificationService = inject(NotificationService);

  async save() {
    if (!this.title.trim() || this.categoriesArray.length === 0 || !this.content.trim()) {
      this.notificationService.error("Please fill all the text fields and add a category! 📝");
      return;
    }

    if (!this.selectedFile && !this.imagePreview) {
      this.notificationService.error("Please upload a cover image! 📸");
      return;
    }

    this.isSubmitting = true;
    this.draftStatus = 'Publishing...';

    try {
      let imageUrl = this.existingBlog?.imageUrl;

      if (this.selectedFile) {
        const uploadUrl = await firstValueFrom(this.blogService.getUploadUrl(this.selectedFile.name, this.selectedFile.type));
        await firstValueFrom(this.blogService.uploadFile(uploadUrl, this.selectedFile));
        imageUrl = uploadUrl.split('?')[0];
      }

      if (this.editId) {
        if (!this.authService.isAdmin() && this.authService.currentUserId() !== this.existingBlog?.authorId) {
          this.notificationService.error("You do not have permission to edit this blog!");
          this.isSubmitting = false;
          return;
        }

        this.store.dispatch(updateBlog({
          id: this.editId,
          title: this.title,
          categories: this.categoriesArray,
          content: this.content,
          imageUrl: imageUrl,
          authorName: this.authService.userDisplayName() || undefined
        }));

      } else {
        if (!this.authService.isAuthenticated()) {
          this.notificationService.error("You must be logged in to post a blog.");
          this.isSubmitting = false;
          return;
        }
        this.store.dispatch(addBlog({
          title: this.title,
          categories: this.categoriesArray,
          content: this.content,
          imageUrl: imageUrl,
          authorName: this.authService.userDisplayName() || undefined
        }));
      }
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to process request. Please try again.");
      this.isSubmitting = false;
      this.draftStatus = 'Draft saved automatically';
    }
  }
}