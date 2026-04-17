import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  ExternalLink, 
  ShieldCheck,
  Globe,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/src/store/index';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow, LogicalPosition, LogicalSize } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { toast } from 'sonner';

export const SandboxedBrowser = () => {
  const isBrowserOpen = useChatStore(state => state.isBrowserOpen);
  const browserUrl = useChatStore(state => state.browserUrl);
  const _closeBrowser = useChatStore(state => state.closeBrowser);
  const closeBrowser = () => {
    console.log(`[DIAG:STATE] closeBrowser called`);
    _closeBrowser();
  };
  const isBrowserLoading = useChatStore(state => state.isBrowserLoading);
  const _setBrowserLoading = useChatStore(state => state.setBrowserLoading);
  const setBrowserLoading = (val: boolean) => {
    console.log(`[DIAG:STATE] setBrowserLoading(${val})`);
    _setBrowserLoading(val);
  };
  const isInitializing = useChatStore(state => state.isInitializing);
  const _setInitializing = useChatStore(state => state.setInitializing);
  const setInitializing = (val: boolean) => {
    console.log(`[DIAG:STATE] setInitializing(${val})`);
    _setInitializing(val);
  };
  const webviewLabel = useChatStore(state => state.webviewLabel);
  const _setWebviewLabel = useChatStore(state => state.setWebviewLabel);
  const setWebviewLabel = (val: string | null) => {
    console.log(`[DIAG:STATE] setWebviewLabel(${val})`);
    _setWebviewLabel(val);
  };

  const [webviewCreated, _setWebviewCreated] = useState(false);
  
  // 1. RENDER LOG
  console.log(`[DIAG:RENDER] Component re-rendered. isBrowserOpen=${isBrowserOpen}, browserUrl=${browserUrl}, isBrowserLoading=${isBrowserLoading}, webviewLabel=${webviewLabel}, isInitializing=${isInitializing}, webviewCreated=${webviewCreated}`);

  const setWebviewCreated = (val: boolean) => {
    console.log(`[DIAG:STATE] setWebviewCreated(${val})`);
    _setWebviewCreated(val);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<WebviewWindow | null>(null);
  const unlistenersRef = useRef<(() => void)[]>([]);
  const prevUrlRef = useRef<string | null>(null);
  const prevOpenRef = useRef<boolean>(false);
  const activeWebviewLabelRef = useRef<string | null>(null);
  const isNavigatingRef = useRef<boolean>(false);
  
  const [title, _setTitle] = useState('Loading...');
  const setTitle = (val: string) => {
    console.log(`[DIAG:STATE] setTitle(${val})`);
    _setTitle(val);
  };
  const [isDarkMode, _setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const setIsDarkMode = (val: boolean | ((prev: boolean) => boolean)) => {
    console.log(`[DIAG:STATE] setIsDarkMode(called)`);
    _setIsDarkMode(val);
  };

  // --- Local Navigation State ---
  const [currentUrl, _setCurrentUrl] = useState(browserUrl);
  const setCurrentUrl = (val: string) => {
    console.log(`[DIAG:STATE] setCurrentUrl(${val})`);
    _setCurrentUrl(val);
  };
  const [inputValue, _setInputValue] = useState(browserUrl);
  const setInputValue = (val: string) => {
    console.log(`[DIAG:STATE] setInputValue(${val})`);
    _setInputValue(val);
  };
  const [history, _setHistory] = useState<string[]>([browserUrl]);
  const setHistory = (val: string[] | ((prev: string[]) => string[])) => {
    console.log(`[DIAG:STATE] setHistory(called)`);
    _setHistory(val);
  };
  const [historyIndex, _setHistoryIndex] = useState(0);
  const setHistoryIndex = (val: number | ((prev: number) => number)) => {
    console.log(`[DIAG:STATE] setHistoryIndex(called)`);
    _setHistoryIndex(val);
  };

  const historyRef = useRef<string[]>([browserUrl]);
  const historyIndexRef = useRef(0);
  const isNavigatingHistoryRef = useRef(false);

  // Keep refs in sync for the navigation listener closure
  useEffect(() => {
    console.log(`[DIAG:EFFECT] History sync effect fired`);
    console.log(`[DIAG:REF] historyRef.current = (called)`);
    historyRef.current = history;
    console.log(`[DIAG:REF] historyIndexRef.current = ${historyIndex}`);
    historyIndexRef.current = historyIndex;
  }, [history, historyIndex]);

  // Update when browser opens with a new initial URL
  useEffect(() => {
    console.log(`[DIAG:EFFECT] Browser open/URL init effect fired. isBrowserOpen=${isBrowserOpen}, browserUrl=${browserUrl}`);
    if (isBrowserOpen && browserUrl) {
      setCurrentUrl(browserUrl);
      setInputValue(browserUrl);
      setHistory([browserUrl]);
      setHistoryIndex(0);
      console.log(`[DIAG:REF] historyRef.current = (called)`);
      historyRef.current = [browserUrl];
      console.log(`[DIAG:REF] historyIndexRef.current = 0`);
      historyIndexRef.current = 0;
    }
  }, [isBrowserOpen, browserUrl]);
  // -------------------------------

  // 0. Theme Observation
  useEffect(() => {
    console.log(`[DIAG:EFFECT] Theme observer effect fired`);
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Utility to generate dynamic CSS
  const getDynamicCSS = (isDark: boolean) => ([
    `:root { color-scheme: ${isDark ? 'dark' : 'light'}; }`,
    `::-webkit-scrollbar { width: 8px; height: 8px; }`,
    `::-webkit-scrollbar-track { background: transparent; }`,
    `::-webkit-scrollbar-thumb { background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }`,
    `::-webkit-scrollbar-thumb:hover { background: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}; background-clip: content-box; }`,
    `[id*="google_ads"], [class*="ad-slot"], [class*="ad-unit"], #ad-container, .ad-inner, [id^="ad_"], .trc_rbox_container, aside[role="complementary"], .sidebar-ads { display: none !important; }`,
    `*::selection { background-color: rgba(139, 92, 246, 0.4) !important; color: #fff !important; }`
  ].join('\n'));

  // Function to inject current theme and privacy guards
  const injectStyle = () => {
    if (!activeWebviewLabelRef.current) return;
    const cssContent = getDynamicCSS(isDarkMode);
    
    // Resilient script: injects shield immediately (no DOM required), and polls for DOM to inject CSS
    const script = `
      (function() {
        const shield = () => {
          try {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
            window.chrome = window.chrome || { runtime: {} };
          } catch (e) {}
        };
        shield();
        window.addEventListener('load', shield);
        
        const injectCss = () => {
          try {
            let style = document.getElementById('finch-browser-style') || document.createElement('style');
            style.id = 'finch-browser-style';
            style.textContent = ${JSON.stringify(cssContent)};
            if (document.head) {
              if (!style.parentElement) document.head.append(style);
            } else if (document.documentElement) {
              if (!style.parentElement) document.documentElement.appendChild(style);
            } else {
              setTimeout(injectCss, 50);
            }
          } catch(e) {
            setTimeout(injectCss, 50);
          }
        };
        injectCss();
      })()
    `;
    invoke('eval_browser_js', { label: activeWebviewLabelRef.current, script }).catch(() => {});
  };

  // Re-inject when theme changes - only if not currently loading a new page
  useEffect(() => {
    console.log(`[DIAG:EFFECT] injectStyle theme effect fired. webviewCreated=${webviewCreated}, webviewLabel=${webviewLabel}, isBrowserLoading=${isBrowserLoading}`);
    if (webviewCreated && webviewLabel && !isBrowserLoading) {
      injectStyle();
    }
  }, [isDarkMode, webviewCreated, webviewLabel, isBrowserLoading]);

  // Loading Fallback: If webview is created but still loading after 5s, assume it's an SPA or streaming site and clear the loading state to allow interaction.
  useEffect(() => {
    console.log(`[DIAG:EFFECT] Fallback timeout effect fired. webviewCreated=${webviewCreated}, isBrowserLoading=${isBrowserLoading}`);
    let fallbackTimeout: NodeJS.Timeout;
    
    if (webviewCreated && isBrowserLoading) {
      fallbackTimeout = setTimeout(() => {
        if (isBrowserLoading && webviewLabel) {
          console.warn(`[SANDBOX] [FALLBACK] Still loading after 5s, forcing ready state: ${webviewLabel}`);
          setBrowserLoading(false);
          injectStyle(); // Just in case it was missed
        }
      }, 5000);
    }

    return () => clearTimeout(fallbackTimeout);
  }, [webviewCreated, isBrowserLoading, webviewLabel]);

  // 1. Webview Lifecycle Management
  useEffect(() => {
    console.log(`[DIAG:EFFECT] Main lifecycle effect fired. isBrowserOpen=${isBrowserOpen}, browserUrl=${browserUrl}`);
    console.log(`[DIAG] Lifecycle effect fired. isBrowserOpen=${isBrowserOpen}, browserUrl=${browserUrl}, prevUrlRef=${prevUrlRef.current}, prevOpenRef=${prevOpenRef.current}, webviewRef.current exists=${!!webviewRef.current}`);

    // Instruction 1: useRef guard to prevent remounts if the URL hasn't actually changed
    // Only return early if we are already open and the URL is the same
    if (isBrowserOpen && browserUrl === prevUrlRef.current && webviewRef.current) {
      console.log(`[DIAG] Early return: URL unchanged guard`);
      return;
    }
    // Only return early if we are already closed and the browser open state hasn't changed
    if (!isBrowserOpen && isBrowserOpen === prevOpenRef.current && !webviewRef.current) {
      console.log(`[DIAG] Early return: already closed guard`);
      return;
    }
    console.log(`[DIAG:REF] prevUrlRef.current = ${browserUrl}`);
    prevUrlRef.current = browserUrl;
    console.log(`[DIAG:REF] prevOpenRef.current = ${isBrowserOpen}`);
    prevOpenRef.current = isBrowserOpen;

    if (!isBrowserOpen || !browserUrl || !contentRef.current) {
      if (webviewRef.current) {
        console.log("[SANDBOX] Closing webview due to browser closed or missing URL/Ref");
        const current = webviewRef.current;
        console.log(`[DIAG:REF] webviewRef.current = null`);
        webviewRef.current = null;
        console.log(`[DIAG:REF] activeWebviewLabelRef.current = null`);
        activeWebviewLabelRef.current = null;
        setWebviewCreated(false);
        current.close().catch(() => {});
      }
      return;
    }

    const mountId = Math.random().toString(36).substring(7);
    let isMounted = true;
    let cleanupRun = false;

    const initWebview = async () => {
      console.log(`[DIAG] initWebview called. isBrowserOpen=${isBrowserOpen}, browserUrl=${browserUrl}, isInitializing=${isInitializing}, mountId=${mountId}`);
      // Re-check conditions inside async
      if (!isBrowserOpen || !browserUrl || !contentRef.current) return;

      const urlToLoad = prevUrlRef.current !== browserUrl ? browserUrl : (prevUrlRef.current ?? browserUrl);

      // Lock initialization globally to prevent collisions
      if (isInitializing) {
        console.log(`[SANDBOX] Already initializing, skipping (Mount: ${mountId})`);
        return;
      }
      setInitializing(true);

      // Close existing if any
      if (webviewRef.current) {
        try {
          const old = webviewRef.current;
          console.log(`[DIAG:REF] webviewRef.current = null`);
          webviewRef.current = null;
          console.log(`[DIAG:REF] activeWebviewLabelRef.current = null`);
          activeWebviewLabelRef.current = null;
          await old.close();
          // Give the OS 100ms to release the HWND
          await new Promise(r => setTimeout(r, 100));
        } catch (e) {}
      }

      if (!isMounted) return;

      try {
        const timestamp = Date.now();
        const label = `sandbox-${timestamp}`; 
        const rect = contentRef.current!.getBoundingClientRect();
        
        const x = Math.round(rect.left);
        const y = Math.round(rect.top);
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);

        console.log(`[SANDBOX] Initializing WebviewWindow: ${label} for URL: ${urlToLoad} (Mount: ${mountId})`);

        if (width === 0 || height === 0) {
          setInitializing(false);
          if (isMounted) setTimeout(initWebview, 100);
          return;
        }

        // Calculate initial screen position using parent window offset and scale factor
        const parentWindow = getCurrentWindow();
        const [pos, scale] = await Promise.all([
          parentWindow.innerPosition(),
          parentWindow.scaleFactor()
        ]);

        if (!isMounted) {
          setInitializing(false);
          return;
        }

        const initialX = (pos.x / scale) + x;
        const initialY = (pos.y / scale) + y;

        const webview = new WebviewWindow(label, {
          url: urlToLoad,
          x: initialX,
          y: initialY,
          width,
          height,
          skipTaskbar: true,
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        });

        // Attach listeners immediately
        const listeners = [
          webview.listen('tauri://window-created', () => {
            console.log(`[DIAG:EVENT] tauri://window-created received. label=${label}, isMounted=${isMounted}`);
            console.log(`[SANDBOX] [EVENT] Window Created: ${label} (Mount: ${mountId})`);
            if (!isMounted) return;
          }),
          webview.listen('tauri://webview-created', () => {
            console.log(`[DIAG:EVENT] tauri://webview-created received. label=${label}, isMounted=${isMounted}`);
            console.log(`[SANDBOX] [EVENT] Webview Created: ${label} (Mount: ${mountId})`);
            if (!isMounted) return;
            setWebviewCreated(true);
            setBrowserLoading(true);
          }),
          webview.listen('tauri://webview-load-finished', () => {
            console.log(`[DIAG:EVENT] tauri://webview-load-finished received. label=${label}, isMounted=${isMounted}`);
            console.log(`[SANDBOX] [EVENT] Load Finished: ${label} (Mount: ${mountId})`);
            if (isMounted) {
              setBrowserLoading(false);
              injectStyle();
            }
          }),
          webview.listen('tauri://navigation-finished', () => {
            console.log(`[DIAG:EVENT] tauri://navigation-finished received. label=${label}, isMounted=${isMounted}`);
            console.log(`[SANDBOX] [EVENT] Navigation Finished: ${label} (Mount: ${mountId})`);
            if (isMounted) {
              setBrowserLoading(false);
              injectStyle();
            }
          }),
          webview.listen('tauri://navigation-error', (e) => {
            console.log(`[DIAG:EVENT] tauri://navigation-error received. label=${label}, isMounted=${isMounted}`);
            console.error(`[SANDBOX] [EVENT] Navigation Error: ${label} (Mount: ${mountId})`, e);
            if (isMounted) setBrowserLoading(false);
          }),
          webview.listen('tauri://navigation', (event) => {
            console.log(`[DIAG:EVENT] tauri://navigation received. label=${label}, isMounted=${isMounted}, payload=${JSON.stringify(event.payload)}`);
            console.log(`[SANDBOX] [EVENT] Navigation Started: ${label} (Mount: ${mountId})`);
            const url = (event.payload as any)?.url || (typeof event.payload === 'string' ? event.payload : null);
            
            if (url && typeof url === 'string' && isMounted) {
              console.log(`[DIAG:REF] isNavigatingRef.current = false`);
              isNavigatingRef.current = false;
              const cleanUrl = url.split('#')[0];
              const currentCleanUrl = (historyRef.current[historyIndexRef.current] || '').split('#')[0];
              const isMeaningfullyDifferent = cleanUrl !== currentCleanUrl;

              // If the URL hasn't changed (ignoring hash), ignore the event entirely (prevents false loading on focus/hash changes)
              if (!isMeaningfullyDifferent) return;

              if (isNavigatingHistoryRef.current) {
                console.log(`[DIAG:REF] isNavigatingHistoryRef.current = false`);
                isNavigatingHistoryRef.current = false;
                setCurrentUrl(url);
                setInputValue(url);
              } else {
                setHistory(prev => {
                  const newHistory = Array.isArray(prev) ? prev.slice(0, historyIndexRef.current + 1) : [];
                  newHistory.push(url);
                  return newHistory;
                });
                setHistoryIndex(prev => (typeof prev === 'number' ? prev + 1 : 0));
                setCurrentUrl(url);
                setInputValue(url);
              }

              if (isMounted) {
                setBrowserLoading(true);
              }
            }
          }),
          webview.listen('tauri://window-move', () => {
            console.log(`[DIAG:EVENT] tauri://window-move received. label=${label}`);
            console.log(`[SANDBOX] [EVENT] Window Move: ${label} (Mount: ${mountId})`);
            syncGeometry();
          }),
          webview.listen('tauri://window-resize', () => {
            console.log(`[DIAG:EVENT] tauri://window-resize received. label=${label}`);
            console.log(`[SANDBOX] [EVENT] Window Resize: ${label} (Mount: ${mountId})`);
            syncGeometry();
          }),
        ];

        console.log(`[DIAG:REF] webviewRef.current = WebviewWindow`);
        webviewRef.current = webview;
        setWebviewLabel(label);
        console.log(`[DIAG:REF] activeWebviewLabelRef.current = ${label}`);
        activeWebviewLabelRef.current = label;
        console.log(`[DIAG:REF] unlistenersRef.current = (called)`);
        unlistenersRef.current = await Promise.all(listeners);

        // --- TEMPORARY: Navigation Probe (Phase 2) ---
        // Determines whether the webview is actually navigating even if events aren't firing.
        const startTime = Date.now();
        let pollCount = 0;
        const probeInterval = setInterval(async () => {
          if (!isMounted || !activeWebviewLabelRef.current) {
            clearInterval(probeInterval);
            return;
          }
          pollCount++;
          if (pollCount > 20) {
            clearInterval(probeInterval);
            console.log(`[NAV-PROBE] Finished 10s probe.`);
            return;
          }
          try {
            const currentProbeUrl = await invoke('debug_get_webview_url', { label: activeWebviewLabelRef.current });
            console.log(`[NAV-PROBE t=${Date.now() - startTime}ms] url=${currentProbeUrl}`);
          } catch (e) {
            console.error(`[NAV-PROBE] Probe failed:`, e);
          }
        }, 500); // 500ms requested
        // --- END TEMPORARY ---

        if (!isMounted) {
          console.log(`[DIAG:REF] unlistenersRef.current = []`);
          unlistenersRef.current.forEach(u => u());
          unlistenersRef.current = [];
          await webview.close().catch(() => {});
          console.log(`[DIAG:REF] activeWebviewLabelRef.current = null`);
          activeWebviewLabelRef.current = null;
          setInitializing(false);
          return;
        }

        setInitializing(false);

      } catch (err) {
        console.error("[SANDBOX] Critical Init Failure:", err);
        setInitializing(false);
        if (isMounted) setBrowserLoading(false);
      }
    };

    initWebview();

    return () => {
      console.log(`[DIAG] Cleanup function called. cleanupRun=${cleanupRun}, webviewRef.current exists=${!!webviewRef.current}, browserUrl=${browserUrl}`);
      if (cleanupRun) return;
      cleanupRun = true;
      console.log(`[SANDBOX] Cleanup Triggered for URL: ${browserUrl}`);
      isMounted = false;
      setInitializing(false);
      
      // Cleanup all listeners
      console.log(`[DIAG:REF] unlistenersRef.current = []`);
      unlistenersRef.current.forEach(unlisten => unlisten());
      unlistenersRef.current = [];
      
      if (webviewRef.current) {
        const current = webviewRef.current;
        console.log(`[DIAG:REF] webviewRef.current = null`);
        webviewRef.current = null;
        console.log(`[DIAG:REF] activeWebviewLabelRef.current = null`);
        activeWebviewLabelRef.current = null;
        console.log(`[SANDBOX] Closing webview: ${current.label}`);
        
        // Use a slight timeout to avoid HWND creation/deletion collisions in fast double-mounts
        setTimeout(() => {
          current.close().catch((e) => {
            if (!e.toString().includes("not found")) {
              console.warn(`[SANDBOX] Close warning for ${current.label}:`, e);
            }
          });
        }, 50);
      }
      
      // Clear loading state if unmounting
      setBrowserLoading(false);
    };
  }, [isBrowserOpen]);

  useEffect(() => {
    console.log(`[DIAG:EFFECT] Store Values observer fired`);
    console.log(`[DIAG] Store values changed: isBrowserOpen=${isBrowserOpen}, browserUrl=${browserUrl}, isBrowserLoading=${isBrowserLoading}, webviewLabel=${webviewLabel}, isInitializing=${isInitializing}`);
  }, [isBrowserOpen, browserUrl, isBrowserLoading, webviewLabel, isInitializing]);

  // 2. Loading Safety Net: Force clear loading if it hangs
  useEffect(() => {
    console.log(`[DIAG:EFFECT] Loading safety net effect fired`);
    let timeout: NodeJS.Timeout;
    if (isBrowserOpen && isBrowserLoading) {
      timeout = setTimeout(() => {
        console.warn("[SANDBOX] Loading timed out after 15s, forcing loading to false");
        setBrowserLoading(false);
      }, 15000);
    }
    return () => clearTimeout(timeout);
  }, [isBrowserOpen, isBrowserLoading]);

  // Function to sync geometry on resize/move
  const syncGeometry = async () => {
    if (!isBrowserOpen || !webviewRef.current || !contentRef.current) return;
    
    try {
      const parent = getCurrentWindow();
      const [pos, scale, rect] = await Promise.all([
        parent.innerPosition(),
        parent.scaleFactor(),
        contentRef.current.getBoundingClientRect()
      ]);
      
      // Only sync if there's actual geometry to sync to
      if (rect.width === 0 || rect.height === 0) return;

      const logicalX = (pos.x / scale) + rect.left;
      const logicalY = (pos.y / scale) + rect.top;

      await webviewRef.current.setPosition(new LogicalPosition(logicalX, logicalY));
      await webviewRef.current.setSize(new LogicalSize(rect.width, rect.height));
    } catch (err: any) {
      if (!err.toString().includes("not found")) {
        console.warn("[SANDBOX] Geometry sync failed:", err);
      }
    }
  };

  // Effect to sync geometry on resize/move
  useEffect(() => {
    console.log(`[DIAG:EFFECT] Geometry sync effect fired. isBrowserOpen=${isBrowserOpen}`);
    if (!isBrowserOpen || !webviewRef.current) return;

    // Listen to main window resize/move
    const appWindow = getCurrentWindow();
    let unlistenResize: () => void;
    let unlistenMove: () => void;

    const setupListeners = async () => {
      try {
        unlistenResize = await appWindow.onResized(() => syncGeometry());
        unlistenMove = await appWindow.onMoved(() => syncGeometry());
      } catch (e) {
        console.warn("Failed to setup tauri window listeners:", e);
      }
    };

    setupListeners();

    // Also use ResizeObserver for the content area itself (React layout changes)
    const observer = new ResizeObserver(() => syncGeometry());
    if (contentRef.current) {
      observer.observe(contentRef.current);
    }

    return () => {
      if (unlistenResize) unlistenResize();
      if (unlistenMove) unlistenMove();
      observer.disconnect();
    };
  }, [isBrowserOpen]);

  const handleClose = () => {
    console.log(`[DIAG:CLICK] Close button clicked`);
    console.log(`[DIAG] handleClose called`);
    closeBrowser();
  };

  const handleRefresh = async () => {
    console.log(`[DIAG:CLICK] Refresh button clicked`);
    console.log(`[DIAG] handleRefresh called. activeWebviewLabelRef=${activeWebviewLabelRef.current}`);
    if (activeWebviewLabelRef.current) {
      try {
        setBrowserLoading(true);

        // Add a one-time listener for navigation-finished to clear loading state
        // Reloads don't trigger webview-load-finished, but they do trigger navigation-finished
        if (webviewRef.current) {
          webviewRef.current.once('tauri://navigation-finished', () => {
            console.log(`[SANDBOX] [EVENT] Refresh Navigation Finished: ${activeWebviewLabelRef.current}`);
            setBrowserLoading(false);
          });
        }

        // Use native Rust command for maximum reliability
        await invoke('reload_browser', { label: activeWebviewLabelRef.current });
      } catch (e) {
        console.warn("Native reload failed, falling back to script injection:", e);
        try {
          const script = `window.location.reload();`;
          await invoke('eval_browser_js', { label: activeWebviewLabelRef.current, script });
        } catch (inner) {
          console.error("Deep refresh failure:", inner);
          // If all reloads fail, ensure we clear loading
          setBrowserLoading(false);
        }
      }
    }
  };

  const handleBack = () => {
    console.log(`[DIAG:CLICK] Back button clicked. historyIndex=${historyIndex}`);
    if (historyIndex > 0 && activeWebviewLabelRef.current) {
      console.log(`[DIAG] handleBack called. historyIndex=${historyIndex}, activeWebviewLabelRef=${activeWebviewLabelRef.current}`);
      console.log(`[DIAG:REF] isNavigatingHistoryRef.current = true`);
      isNavigatingHistoryRef.current = true;
      setHistoryIndex(prev => (typeof prev === 'number' ? prev - 1 : 0));
      invoke('eval_browser_js', { label: activeWebviewLabelRef.current, script: `window.history.back()` }).catch(() => {});
    }
  };

  const handleForward = () => {
    console.log(`[DIAG:CLICK] Forward button clicked. historyIndex=${historyIndex}`);
    if (historyIndex < history.length - 1 && activeWebviewLabelRef.current) {
      console.log(`[DIAG:REF] isNavigatingHistoryRef.current = true`);
      isNavigatingHistoryRef.current = true;
      setHistoryIndex(prev => (typeof prev === 'number' ? prev + 1 : 0));
      invoke('eval_browser_js', { label: activeWebviewLabelRef.current, script: `window.history.forward()` }).catch(() => {});
    }
  };

  const handleOpenExternal = async () => {
    console.log(`[DIAG:CLICK] External link button clicked`);
    try {
      await openUrl(currentUrl);
    } catch (e) {
      window.open(currentUrl, '_blank');
    }
  };

  // Keyboard shortcuts wrapper to keep useEffect dependencies stable
  const refreshRef = useRef(handleRefresh);
  console.log(`[DIAG:REF] refreshRef.current = (called)`);
  refreshRef.current = handleRefresh;
  const closeRef = useRef(handleClose);
  console.log(`[DIAG:REF] closeRef.current = (called)`);
  closeRef.current = handleClose;

  useEffect(() => {
    console.log(`[DIAG:EFFECT] Keyboard shortcuts effect fired`);
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshRef.current();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, []); // Constant array length for HMR and stability

  return (
    <AnimatePresence>
      {isBrowserOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none">
          {/* Invisible Top Drag Handle - Allows moving the main app by clicking the top area */}
          <div 
            className="absolute top-0 left-0 right-0 h-10 z-[1001] pointer-events-auto cursor-default" 
            data-tauri-drag-region 
          />

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            onClick={() => {
              console.log(`[DIAG:CLICK] Backdrop clicked`);
              handleClose();
            }}
          />

          {/* Browser Container */}
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onUpdate={() => {
              // Sync geometry DURING the animation to prevent "detached" look
              syncGeometry();
            }}
            onAnimationComplete={() => {
              syncGeometry();
              // One more just to be absolutely sure after spring settles
              setTimeout(syncGeometry, 50);
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className={cn(
              "relative w-[92vw] h-[88vh] max-w-7xl max-h-[1000px]",
              "rounded-2xl overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]",
              "border border-white/20 dark:border-white/10",
              "bg-white/80 dark:bg-neutral-900/80 backdrop-blur-2xl flex flex-col pointer-events-auto"
            )}
          >
            {/* Header / Address Bar */}
            <div className="h-14 flex items-center justify-between px-4 gap-4 border-b border-white/10 select-none shrink-0 bg-white/5 dark:bg-neutral-900/5">
              {/* Left Side: Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  onClick={handleClose}
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-muted-foreground hover:text-foreground transition-colors relative z-10"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-0.5 ml-1" data-tauri-drag-region={false}>
                  <button 
                    onClick={handleBack}
                    disabled={historyIndex <= 0}
                    className={cn(
                      "p-2 rounded-full transition-colors",
                      historyIndex > 0 ? "hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground" : "opacity-30 cursor-not-allowed"
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={handleForward}
                    disabled={historyIndex >= history.length - 1}
                    className={cn(
                      "p-2 rounded-full transition-colors",
                      historyIndex < history.length - 1 ? "hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground hover:text-foreground" : "opacity-30 cursor-not-allowed"
                    )}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
 
              {/* Address Bar */}
              <div className="flex-1 max-w-2xl min-w-0 flex items-center gap-3 bg-black/5 dark:bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs mx-auto relative z-10">
                <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    console.log(`[DIAG:CLICK] Address bar change: value=${e.target.value}`);
                    setInputValue(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    console.log(`[DIAG:CLICK] Address bar keydown: key=${e.key}, value=${inputValue}`);
                    if (e.key === 'Enter') {
                      let url = inputValue.trim();
                      if (url) {
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                          url = `https://${url}`;
                        }
                        if (activeWebviewLabelRef.current) {
                          console.log(`[DIAG:REF] isNavigatingRef.current = true`);
                          isNavigatingRef.current = true;
                          invoke('eval_browser_js', { label: activeWebviewLabelRef.current, script: `window.location.href = ${JSON.stringify(url)}` });
                        }
                      }
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={() => {
                    console.log(`[DIAG:CLICK] Address bar blur. isNavigatingRef=${isNavigatingRef.current}, currentUrl=${currentUrl}`);
                    if (!isNavigatingRef.current) {
                      setInputValue(currentUrl);
                    }
                  }}
                  className="bg-transparent border-none outline-none truncate text-muted-foreground flex-1 font-mono focus:text-foreground placeholder:text-muted-foreground/50 transition-colors"
                  spellCheck={false}
                />
                {isBrowserLoading && <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />}
                <button 
                  onClick={handleRefresh}
                  className="hover:text-foreground transition-colors shrink-0 p-1"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
 
              {/* Right Side Tools - Keep visible */}
              <div className="flex items-center gap-2 shrink-0 relative z-10">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="h-3 w-3" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Sandboxed</span>
                </div>
                
                <button 
                  onClick={handleOpenExternal}
                  className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-muted-foreground hover:text-foreground"
                  title="Open in System Browser"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div 
              ref={contentRef} 
              className="flex-1 bg-neutral-100 dark:bg-black/10 relative"
            >
              {!webviewCreated && (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm animate-pulse">
                  Initializing sandboxed environment...
                </div>
              )}

              {isBrowserLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-black/40 backdrop-blur-[2px] z-[10]">
                   <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
