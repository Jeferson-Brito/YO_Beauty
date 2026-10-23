import { normalizeSearch } from './search';

export function slugify(value: string): string {
  const slug = normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'item';
}
