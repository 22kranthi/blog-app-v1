import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BlogService } from '../blog.service';

interface CognitoUser {
  username: string;
  email?: string;
  name?: string;
  createdAt?: string;
  status?: string;
  isAdmin?: boolean;
}

const LIST_USERS_QUERY = `
  query ListUsers($limit: Int, $nextToken: String) {
    listUsers(limit: $limit, nextToken: $nextToken) {
      items {
        username
        email
        name
        createdAt
        status
        isAdmin
      }
      nextToken
    }
  }
`;

const SET_ADMIN_ROLE_MUTATION = `
  mutation SetAdminRole($username: String!, $isAdmin: Boolean!) {
    setAdminRole(username: $username, isAdmin: $isAdmin)
  }
`;

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css'
})
export class AdminUsers implements OnInit {
  private blogService = inject(BlogService);

  users       = signal<CognitoUser[]>([]);
  loading     = signal(true);
  nextToken   = signal<string | null>(null);
  loadingMore = signal(false);
  searchQuery = signal('');
  togglingId  = signal<string | null>(null);

  filteredUsers = () => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.users();
    return this.users().filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  };

  ngOnInit() {
    this.fetchUsers();
  }

  async fetchUsers(append = false) {
    if (!append) this.loading.set(true);
    else this.loadingMore.set(true);

    try {
      const token = append ? this.nextToken() : null;
      const res: any = await this.blogService.graphqlRequest(
        LIST_USERS_QUERY,
        { limit: 25, nextToken: token }
      );
      const data = res?.data?.listUsers;
      if (data) {
        const incoming = data.items || [];
        this.users.update(prev => append ? [...prev, ...incoming] : incoming);
        this.nextToken.set(data.nextToken || null);
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      this.loading.set(false);
      this.loadingMore.set(false);
    }
  }

  async toggleAdmin(user: CognitoUser) {
    this.togglingId.set(user.username);
    try {
      await this.blogService.graphqlRequest(
        SET_ADMIN_ROLE_MUTATION,
        { username: user.username, isAdmin: !user.isAdmin }
      );
      // Optimistic update
      this.users.update(prev =>
        prev.map(u => u.username === user.username ? { ...u, isAdmin: !u.isAdmin } : u)
      );
    } catch (e) {
      console.error('Failed to update role:', e);
    } finally {
      this.togglingId.set(null);
    }
  }

  loadMore() {
    this.fetchUsers(true);
  }

  getInitial(user: CognitoUser): string {
    return (user.name || user.email || user.username || '?').charAt(0).toUpperCase();
  }
}
