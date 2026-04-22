/**
 * Checks if the application is running in a Tauri context.
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
}

const MASK_SENTINEL = "••••••••";

/**
 * Returns "" when the backend returns a masked key sentinel, otherwise
 * returns the value as-is. Use at every get_provider_config call site
 * before putting a key value into React state.
 */
export function unmaskKey(val: string): string {
  return val === MASK_SENTINEL ? "" : val;
}

type TauriInvoke = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

/**
 * Returns invoke in Tauri runtime, otherwise null for browser mode.
 */
export async function getTauriInvoke(): Promise<TauriInvoke | null> {
  if (!isTauri()) return null;
  const core = await import("@tauri-apps/api/core");
  return core?.invoke ?? null;
}
