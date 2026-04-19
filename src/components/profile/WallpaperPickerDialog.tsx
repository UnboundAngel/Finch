import { useCallback, useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ImagePlus, X } from 'lucide-react';
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
  const pendingGifRef = useRef<string | null>(null);

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

  const handleImportedPath = useCallback(
    async (path: string) => {
      if (isGifPath(path)) {
        pendingGifRef.current = path;
        setGifWarnOpen(true);
        return;
      }
      finalizePath(path);
    },
    [finalizePath]
  );

  const pickBackground = async () => {
    if (!isTauri()) {
      toast.error('Wallpapers require the desktop app');
      return;
    }
    try {
      const path = await invoke<string>('import_user_media', { kind: 'background' });
      await handleImportedPath(path);
    } catch (e) {
      if (e !== 'No file selected') toast.error(String(e));
    }
  };

  const dismissPendingGif = useCallback(async () => {
    const path = pendingGifRef.current;
    pendingGifRef.current = null;
    if (path && isTauri()) {
      try {
        await invoke('remove_imported_media', { path });
      } catch {
        /* ignore */
      }
    }
  }, []);

  const confirmGif = useCallback(() => {
    const path = pendingGifRef.current;
    pendingGifRef.current = null;
    if (path) finalizePath(path);
  }, [finalizePath]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="no-drag sm:max-w-lg rounded-2xl border-border bg-card p-0 gap-0 overflow-hidden">
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
                className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-muted/30 p-8 min-h-[120px] hover:bg-muted/50 transition-colors text-center"
                onClick={() => void pickBackground()}
              >
                <div className="rounded-xl bg-background/80 p-4 border border-border">
                  <ImagePlus className="h-10 w-10 text-primary/80" />
                </div>
                <span className="text-sm font-medium text-primary">Upload image or GIF</span>
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
                      className="h-16 w-24 rounded-xl border-2 border-border overflow-hidden hover:border-primary/50 transition-colors shrink-0"
                      onClick={() => void handleImportedPath(p)}
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
