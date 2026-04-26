export interface Blog {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  category: string;
  content: string;
  summary_ai?: string;
  createdAt?: string;
}