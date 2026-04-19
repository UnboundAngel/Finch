import { useCallback, useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ImagePlus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getRecentAvatars, pushRecentAvatar, removeRecentAvatar } from '@/src/lib/mediaRecents';
import { isGifPath, resolveMediaSrc } from '@/src/lib/mediaPaths';
import { GifImpactWarningDialog } from '@/src/components/profile/GifImpactWarningDialog';
import { isTauri } from '@/src/lib/tauri-utils';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with absolute file path under app data (suitable for storing on Profile.avatarUrl). */
  onChoose: (absolutePath: string) => void;
};

export function AvatarPickerDialog({ open, onOpenChange, onChoose }: Props) {
  const [recents, setRecents] = useState<string[]>([]);
  const [gifWarnOpen, setGifWarnOpen] = useState(false);
  const pendingGifRef = useRef<string | null>(null);

  const refreshRecents = useCallback(() => {
    setRecents(getRecentAvatars());
  }, []);

  useEffect(() => {
    if (open) refreshRecents();
  }, [open, refreshRecents]);

  const finalizePath = useCallback(
    (path: string) => {
      pushRecentAvatar(path);
      onChoose(path);
      onOpenChange(false);
      toast.success('Profile picture updated');
    },
    [onChoose, onOpenChange]
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

  const importKind = async (kind: 'avatar_static' | 'avatar_gif') => {
    if (!isTauri()) {
      toast.error('Image upload requires the desktop app');
      return;
    }
    try {
      const path = await invoke<string>('import_user_media', { kind });
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
        <DialogContent
          showCloseButton={false}
          className="no-drag sm:max-w-lg rounded-2xl border-border bg-card p-0 gap-0 overflow-hidden"
        >
          <DialogHeader className="px-6 pt-6 pb-2 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-xl font-semibold">Select an Image</DialogTitle>
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
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-muted/30 p-8 min-h-[160px] hover:bg-muted/50 transition-colors text-center"
                onClick={() => void importKind('avatar_static')}
              >
                <div className="rounded-xl bg-background/80 p-4 border border-border">
                  <ImagePlus className="h-10 w-10 text-primary/80" />
                </div>
                <span className="text-sm font-medium text-primary">Upload image</span>
                <span className="text-[11px] text-muted-foreground leading-snug">
                  PNG, JPEG, or WebP
                </span>
              </button>

              <button
                type="button"
                className="group relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-muted/30 p-3 min-h-[160px] hover:bg-muted/50 transition-colors overflow-hidden"
                onClick={() => void importKind('avatar_gif')}
              >
                <div className="absolute inset-2 grid grid-cols-2 gap-1 rounded-xl overflow-hidden opacity-40">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30" />
                  ))}
                </div>
                <div className="relative z-10 flex flex-col items-center gap-2 py-6">
                  <span className="text-xs font-bold tracking-wide text-primary drop-shadow-sm">
                    GIF
                  </span>
                  <span className="text-sm font-medium text-primary drop-shadow-sm">Choose GIF</span>
                  <span className="text-[10px] text-primary/70">from your files</span>
                </div>
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-primary">Recent avatars</h3>
              <p className="text-xs text-muted-foreground">
                Your six most recently chosen profile pictures (local files).
              </p>
              <TooltipProvider delay={250}>
                <div className="flex gap-2 flex-wrap">
                  {recents.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No recent uploads yet.</p>
                  ) : (
                    recents.map((p) => (
                      <div key={p} className="relative h-14 w-14 shrink-0">
                        <button
                          type="button"
                          className="absolute inset-0 z-0 rounded-full border-2 border-border overflow-hidden hover:border-primary/50 transition-colors"
                          onClick={() => void handleImportedPath(p)}
                          title={p}
                        >
                          <img
                            src={resolveMediaSrc(p)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </button>
                        <div className="group/corner absolute top-0 right-0 z-10 flex h-[52%] w-[52%] items-start justify-end pt-0.5 pr-0.5">
                          <Tooltip>
                            <TooltipTrigger
                              render={(props) => {
                                const { className, onClick: onTriggerClick, ...rest } = props;
                                return (
                                  <button
                                    {...rest}
                                    type="button"
                                    className={cn(
                                      'pointer-events-none flex h-6 w-6 scale-90 items-center justify-center rounded-full border border-border/60 bg-background/70 text-rose-400 opacity-0 shadow-md backdrop-blur-sm transition-[opacity,transform] group-hover/corner:pointer-events-auto group-hover/corner:scale-100 group-hover/corner:opacity-100 focus-visible:pointer-events-auto focus-visible:scale-100 focus-visible:opacity-100',
                                      className
                                    )}
                                    onClick={(e) => {
                                      onTriggerClick?.(e as React.MouseEvent<HTMLButtonElement>);
                                      e.preventDefault();
                                      e.stopPropagation();
                                      removeRecentAvatar(p);
                                      refreshRecents();
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" aria-hidden />
                                    <span className="sr-only">Remove from recents</span>
                                  </button>
                                );
                              }}
                            />
                            <TooltipContent side="top" sideOffset={6}>
                              Remove
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TooltipProvider>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <GifImpactWarningDialog
        open={gifWarnOpen}
        onOpenChange={setGifWarnOpen}
        context="avatar"
        onCancel={() => void dismissPendingGif()}
        onConfirm={() => confirmGif()}
      />
    </>
  );
}
