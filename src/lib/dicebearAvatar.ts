/**
 * Default fun-emoji avatar URL. Uses a light tile so line art stays visible on dark UI
 * (transparent reads as black-on-black inside the circular preview).
 */
export function funEmojiAvatarUrl(seed: string): string {
  const s = encodeURIComponent(seed.trim() || 'User');
  return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${s}&backgroundColor=f4f4f5`;
}
