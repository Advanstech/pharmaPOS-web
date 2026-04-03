export type NewsCategory = 'health' | 'industry' | 'awareness';

export interface PharmaNewsItem {
  title: string;
  url?: string;
  category: NewsCategory;
}
