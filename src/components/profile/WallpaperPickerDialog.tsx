import { useCallback, useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getRecentWallpapers, pushRecentWallpaper } from '@/src/lib/mediaRecents';
import { isGifPath, resolveMediaSrc } from '@/src/lib/mediaPaths';
import { GifImpactWarningDialog } from '@/src/components/profile/GifImpactWarningDialog';
import { isTauri } from '@/src/lib/tauri-utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which profile field this wallpaper applies to. */
  mode: 'light' | 'dark';
  onApply: (absolutePath: string) => void;
};

export function WallpaperPickerDialog({ open, onOpenChange, mode, onApply }: Props) {
  const [recents, setRecents] = useState<string[]>([]);
  const [gifWarnOpen, setGifWarnOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Stores the path. We also need to know if it needs processing (new upload) or is already processed (recent)
  const pendingActionRef = useRef<{ path: string, isRecent: boolean } | null>(null);

  const refreshRecents = useCallback(() => {
    setRecents(getRecentWallpapers());
  }, []);

  useEffect(() => {
    if (open) refreshRecents();
  }, [open, refreshRecents]);

  const finalizePath = useCallback(
    (path: string) => {
      pushRecentWallpaper(path);
      onApply(path);
      onOpenChange(false);
      toast.success(
        mode === 'light' ? 'Light mode wallpaper updated' : 'Dark mode wallpaper updated'
      );
    },
    [mode, onApply, onOpenChange]
  );

  const processAndFinalizePath = async (originalPath: string) => {
    try {
      setIsProcessing(true);
      toast.loading('Processing image...', { id: 'media-process' });
      const finalPath = await invoke<string>('process_imported_media', { path: originalPath, kind: 'background' });
      toast.dismiss('media-process');
      finalizePath(finalPath);
    } catch (e) {
      toast.dismiss('media-process');
      toast.error(`Processing failed: ${e}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecentClick = useCallback(
    (path: string) => {
      if (isGifPath(path)) {
        pendingActionRef.current = { path, isRecent: true };
        setGifWarnOpen(true);
        return;
      }
      finalizePath(path);
    },
    [finalizePath]
  );

  const pickBackground = async () => {
    if (!isTauri()) {
      toast.error('Bro, wallpapers only work in the desktop app right now.');
      return;
    }
    try {
      const file = await openDialog({
        multiple: false,
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
      });
      if (!file) return;

      // file path access depends on Tauri v2 return shape; plugin-dialog returns an object with `path` or directly a string if multiple is false, wait, in tauri 2, for single pick, it returns an object or null?
      // Wait, tauri-plugin-dialog return type for single pick is `string | null`? No, wait. 
      // Actually, let's just use `file.path ?? file` if it's an object. But let's assume it returns a string if we look at other usages.
      const path = typeof file === 'string' ? file : (file as any).path ?? file;
      
      if (!path || typeof path !== 'string') return;

      if (isGifPath(path)) {
        pendingActionRef.current = { path, isRecent: false };
        setGifWarnOpen(true);
        return;
      }
      
      await processAndFinalizePath(path);
    } catch (e) {
      toast.error(`That wallpaper import wiped out: ${e}`);
    }
  };

  const dismissPendingGif = useCallback(() => {
    pendingActionRef.current = null;
  }, []);

  const confirmGif = useCallback(() => {
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    
    if (pending) {
      if (pending.isRecent) {
        finalizePath(pending.path);
      } else {
        processAndFinalizePath(pending.path);
      }
    }
  }, [finalizePath]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="no-drag sm:max-w-lg rounded-2xl border-border bg-card p-0 gap-0 overflow-hidden"
        >
          <DialogHeader className="px-6 pt-6 pb-2 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-xl font-semibold">Select a wallpaper</DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-6">
            <p className="text-xs text-muted-foreground -mt-1">
              {mode === 'light'
                ? 'This image is used when the app is in light mode.'
                : 'This image is used when the app is in dark mode.'}
            </p>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                disabled={isProcessing}
                className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-muted/30 p-8 min-h-[120px] hover:bg-muted/50 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => void pickBackground()}
              >
                <div className="rounded-xl bg-background/80 p-4 border border-border">
                  {isProcessing ? (
                    <Loader2 className="h-10 w-10 text-primary/80 animate-spin" />
                  ) : (
                    <ImagePlus className="h-10 w-10 text-primary/80" />
                  )}
                </div>
                <span className="text-sm font-medium text-primary">
                  {isProcessing ? 'Processing...' : 'Upload image or GIF'}
                </span>
                <span className="text-[11px] text-muted-foreground leading-snug">
                  PNG, JPEG, WebP, or GIF from your computer
                </span>
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-primary">Recent backgrounds</h3>
              <p className="text-xs text-muted-foreground">
                Your six most recently applied wallpapers (local files).
              </p>
              <div className="flex gap-2 flex-wrap">
                {recents.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No recent wallpapers yet.</p>
                ) : (
                  recents.map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={isProcessing}
                      className="h-16 w-24 rounded-xl border-2 border-border overflow-hidden hover:border-primary/50 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => void handleRecentClick(p)}
                      title={p}
                    >
                      <img
                        src={resolveMediaSrc(p)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <GifImpactWarningDialog
        open={gifWarnOpen}
        onOpenChange={setGifWarnOpen}
        context="wallpaper"
        onCancel={() => void dismissPendingGif()}
        onConfirm={() => confirmGif()}
      />
    </>
  );
}
