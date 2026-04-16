import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri as checkIsTauri } from "@/src/lib/tauri";

/**
 * Hook to manage Tauri-specific window state.
 */
export function useTauri() {
  const [isTauri] = useState(checkIsTauri());
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri) return;

    let unlisten: (() => void) | undefined;

    const setupListeners = async () => {
      const window = getCurrentWindow();
      
      // Initial check
      const maximized = await window.isMaximized();
      setIsMaximized(maximized);

      // Listen for window resize to check maximization status
      // We listen for both "tauri://resize" and custom maximize events if necessary
      // In Tauri v2, we can use listen on the window object
      const unlistenResize = await window.onResized(async () => {
        const maximized = await window.isMaximized();
        setIsMaximized(maximized);
      });

      unlisten = unlistenResize;
    };

    setupListeners();

    return () => {
      if (unlisten) unlisten();
    };
  }, [isTauri]);

  return { isTauri, isMaximized };
}
