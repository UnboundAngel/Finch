const AVATAR_KEY = 'finch_recent_avatars';
const WALLPAPER_KEY = 'finch_recent_wallpapers';
const MAX = 6;

function readList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

function writeList(key: string, paths: string[]) {
  localStorage.setItem(key, JSON.stringify(paths.slice(0, MAX)));
}

export function getRecentAvatars(): string[] {
  return readList(AVATAR_KEY);
}

export function getRecentWallpapers(): string[] {
  return readList(WALLPAPER_KEY);
}

export function pushRecentAvatar(path: string) {
  const next = [path, ...readList(AVATAR_KEY).filter((p) => p !== path)];
  writeList(AVATAR_KEY, next);
}

export function removeRecentAvatar(path: string) {
  const next = readList(AVATAR_KEY).filter((p) => p !== path);
  writeList(AVATAR_KEY, next);
}

export function pushRecentWallpaper(path: string) {
  const next = [path, ...readList(WALLPAPER_KEY).filter((p) => p !== path)];
  writeList(WALLPAPER_KEY, next);
}
