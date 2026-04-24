import { useCallback, useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { ImagePlus, Trash2, X, Loader2 } from 'lucide-react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Stores the path. We also need to know if it needs processing (new upload) or is already processed (recent)
  const pendingActionRef = useRef<{ path: string, isRecent: boolean, kind: 'avatar_static' | 'avatar_gif' } | null>(null);

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

  const processAndFinalizePath = async (originalPath: string, kind: 'avatar_static' | 'avatar_gif') => {
    try {
      setIsProcessing(true);
      toast.loading('Processing image...', { id: 'media-process' });
      const finalPath = await invoke<string>('process_imported_media', { path: originalPath, kind });
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
        pendingActionRef.current = { path, isRecent: true, kind: 'avatar_gif' };
        setGifWarnOpen(true);
        return;
      }
      finalizePath(path);
    },
    [finalizePath]
  );

  const importKind = async (kind: 'avatar_static' | 'avatar_gif') => {
    if (!isTauri()) {
      toast.error('Bro, image uploads only work in the desktop app right now.');
      return;
    }
    try {
      const extensions = kind === 'avatar_gif' ? ['gif'] : ['png', 'jpg', 'jpeg', 'webp'];
      const file = await openDialog({
        multiple: false,
        filters: [{ name: kind === 'avatar_gif' ? 'GIF' : 'Images', extensions }]
      });
      if (!file) return;

      const path = typeof file === 'string' ? file : (file as any).path ?? file;
      
      if (!path || typeof path !== 'string') return;

      if (kind === 'avatar_gif' || isGifPath(path)) {
        pendingActionRef.current = { path, isRecent: false, kind: 'avatar_gif' };
        setGifWarnOpen(true);
        return;
      }
      
      await processAndFinalizePath(path, kind);
    } catch (e) {
      toast.error(`That image import face-planted: ${e}`);
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
        processAndFinalizePath(pending.path, pending.kind);
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
                disabled={isProcessing}
                className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-muted/30 p-8 min-h-[160px] hover:bg-muted/50 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => void importKind('avatar_static')}
              >
                <div className="rounded-xl bg-background/80 p-4 border border-border">
                  {isProcessing ? (
                    <Loader2 className="h-10 w-10 text-primary/80 animate-spin" />
                  ) : (
                    <ImagePlus className="h-10 w-10 text-primary/80" />
                  )}
                </div>
                <span className="text-sm font-medium text-primary">Upload image</span>
                <span className="text-[11px] text-muted-foreground leading-snug">
                  PNG, JPEG, or WebP
                </span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                className="group relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-muted/30 p-3 min-h-[160px] hover:bg-muted/50 transition-colors overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => void importKind('avatar_gif')}
              >
                <div className="absolute inset-2 grid grid-cols-2 gap-1 rounded-xl overflow-hidden opacity-40">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="bg-gradient-to-br from-violet-500/40 to-fuchsia-500/30" />
                  ))}
                </div>
                <div className="relative z-10 flex flex-col items-center gap-2 py-6">
                  <span className="inline-flex items-center justify-center text-xs font-bold tracking-wide text-primary drop-shadow-sm">
                    <span className="bg-background/80 rounded-md px-2 py-0.5 border border-border mr-1" style={{ minWidth: 20, minHeight: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      GIF 
                    </span>
                  </span>
                  <span className="text-sm font-medium text-primary drop-shadow-sm">Choose an animated pfp</span>
                </div>
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-primary">Recent avatars</h3>
              <p className="text-xs text-muted-foreground">
                The last 6 images you used for your pfp.
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
                          disabled={isProcessing}
                          className="absolute inset-0 z-0 rounded-full border-2 border-border overflow-hidden hover:border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => void handleRecentClick(p)}
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
                                      'pointer-events-none flex h-6 w-6 scale-90 items-center justify-center rounded-full border border-red-950 bg-gradient-to-br from-red-950 to-black text-rose-300 opacity-0 shadow-md transition-[opacity,transform] group-hover/corner:pointer-events-auto group-hover/corner:scale-100 group-hover/corner:opacity-100 focus-visible:pointer-events-auto focus-visible:scale-100 focus-visible:opacity-100',
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
                            <TooltipContent
                              side="top"
                              sideOffset={17}
                            >
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
