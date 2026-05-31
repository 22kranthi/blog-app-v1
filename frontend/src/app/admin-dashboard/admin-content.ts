import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { getAllBlogsUnfiltered, getLoading } from '../store/blog.selector';
import { loadBlogs, deleteBlog } from '../store/blog.action';
import { Blog } from '../model/blog.model';

type SortField = 'title' | 'authorName' | 'createdAt' | 'categories';
type SortDir   = 'asc' | 'desc';

@Component({
  selector: 'app-admin-content',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-content.html',
  styleUrl: './admin-content.css'
})
export class AdminContent implements OnInit {
  private store = inject(Store);

  allBlogs$: Observable<Blog[]> = this.store.select(getAllBlogsUnfiltered);
  loading$: Observable<boolean>  = this.store.select(getLoading);

  // Local state
  searchQuery  = signal('');
  sortField    = signal<SortField>('createdAt');
  sortDir      = signal<SortDir>('desc');
  selectedIds  = signal<Set<string>>(new Set());
  bulkConfirm  = signal(false);

  // All blogs cached locally for filtering/sorting
  allBlogs     = signal<Blog[]>([]);

  filteredBlogs = computed(() => {
    const q   = this.searchQuery().toLowerCase().trim();
    const sf  = this.sortField();
    const sd  = this.sortDir();

    let list = this.allBlogs().filter(b => {
      if (!q) return true;
      return (
        b.title?.toLowerCase().includes(q) ||
        b.authorName?.toLowerCase().includes(q) ||
        b.categories?.some(c => c.toLowerCase().includes(q))
      );
    });

    list = [...list].sort((a, b) => {
      let av: string = '';
      let bv: string = '';
      if (sf === 'title')      { av = a.title || '';       bv = b.title || ''; }
      if (sf === 'authorName') { av = a.authorName || '';  bv = b.authorName || ''; }
      if (sf === 'createdAt')  { av = a.createdAt || '';   bv = b.createdAt || ''; }
      if (sf === 'categories') { av = (a.categories || []).join(); bv = (b.categories || []).join(); }
      return sd === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    return list;
  });

  allSelected = computed(() =>
    this.filteredBlogs().length > 0 &&
    this.filteredBlogs().every(b => this.selectedIds().has(b.id))
  );

  ngOnInit() {
    this.store.dispatch(loadBlogs({ limit: 200 }));
    this.allBlogs$.subscribe(blogs => this.allBlogs.set(blogs));
  }

  // ── Sorting ─────────────────────────────────
  setSort(field: SortField) {
    if (this.sortField() === field) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('asc');
    }
  }

  getSortIcon(field: SortField): string {
    if (this.sortField() !== field) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  // ── Selection ───────────────────────────────
  toggleAll() {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.filteredBlogs().map(b => b.id)));
    }
  }

  toggleOne(id: string) {
    const s = new Set(this.selectedIds());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selectedIds.set(s);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  // ── Delete ──────────────────────────────────
  deleteSingle(id: string) {
    if (confirm('Permanently delete this post?')) {
      this.store.dispatch(deleteBlog({ id }));
      const s = new Set(this.selectedIds());
      s.delete(id);
      this.selectedIds.set(s);
    }
  }

  bulkDelete() {
    const ids = Array.from(this.selectedIds());
    if (!ids.length) return;
    if (confirm(`Permanently delete ${ids.length} post${ids.length > 1 ? 's' : ''}?`)) {
      ids.forEach(id => this.store.dispatch(deleteBlog({ id })));
      this.selectedIds.set(new Set());
      this.bulkConfirm.set(false);
    }
  }

  clearSelection() {
    this.selectedIds.set(new Set());
    this.bulkConfirm.set(false);
  }

  // ── Export ──────────────────────────────────
  exportCSV() {
    const blogs = this.filteredBlogs();
    const headers = ['ID', 'Title', 'Author', 'Categories', 'Status', 'Created At', 'Updated At'];
    const rows = blogs.map(b => [
      b.id,
      `"${(b.title || '').replace(/"/g, '""')}"`,
      `"${(b.authorName || '').replace(/"/g, '""')}"`,
      `"${(b.categories || []).join(', ')}"`,
      b.status || 'PUBLISHED',
      b.createdAt || '',
      b.updatedAt || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this.downloadFile(csv, 'modern-source-posts.csv', 'text/csv');
  }

  exportJSON() {
    const blogs = this.filteredBlogs().map(b => ({
      id: b.id,
      title: b.title,
      authorId: b.authorId,
      authorName: b.authorName,
      categories: b.categories,
      status: b.status || 'PUBLISHED',
      summary_ai: b.summary_ai,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    }));
    const json = JSON.stringify(blogs, null, 2);
    this.downloadFile(json, 'modern-source-posts.json', 'application/json');
  }

  private downloadFile(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Utils ───────────────────────────────────
  getReadingTime(content: string): number {
    if (!content) return 0;
    return Math.ceil(content.trim().split(/\s+/).length / 200);
  }

  getStatusClass(status?: string): string {
    switch ((status || 'PUBLISHED').toUpperCase()) {
      case 'DRAFT':     return 'status-draft';
      case 'FLAGGED':   return 'status-flagged';
      case 'UNPUBLISHED': return 'status-unpublished';
      default:          return 'status-published';
    }
  }

  getStatusLabel(status?: string): string {
    return (status || 'PUBLISHED').charAt(0) + (status || 'PUBLISHED').slice(1).toLowerCase();
  }

  trackById(_: number, blog: Blog): string { return blog.id; }
}
