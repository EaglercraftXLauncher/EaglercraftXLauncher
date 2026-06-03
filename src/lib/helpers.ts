export function getGravatarUrl(email: string, size = 200): string {
  // Browser-safe: use dicebear as avatar service (no crypto needed)
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(email)}&size=${size}&backgroundColor=4f7cff&textColor=ffffff`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function truncateText(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : text.slice(0, maxLength) + '…';
}

export function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, wait: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
