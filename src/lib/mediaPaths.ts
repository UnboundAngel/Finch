import { convertFileSrc } from '@tauri-apps/api/core';
import { isTauri } from '@/src/lib/tauri-utils';

/** Local file paths or remote URLs for avatars / wallpapers. */
export function resolveMediaSrc(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (!isTauri()) return url;
  try {
    return convertFileSrc(url);
  } catch {
    return url;
  }
}

export function isGifPath(path: string): boolean {
  return path.toLowerCase().endsWith('.gif');
}
