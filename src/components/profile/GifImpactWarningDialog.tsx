import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: 'avatar' | 'wallpaper';
  onConfirm: () => void;
  /** Called when the user backs out (Cancel, overlay, Escape) without confirming. */
  onCancel: () => void;
};

export function GifImpactWarningDialog({ open, onOpenChange, context, onConfirm, onCancel }: Props) {
  const isAvatar = context === 'avatar';
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Animated GIF selected</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground space-y-2">
            <div className="text-sm">
              {isAvatar ? (
                <>
                  <div className="block">
                    GIF avatars animate wherever your profile appears (profile picker, sidebar, and
                    similar surfaces). They can use more memory and CPU than a still image.
                  </div>
                  <div className="block">Still images (PNG, JPEG, WebP) are recommended for the lightest experience.</div>
                </>
              ) : (
                <>
                  <div className="block">
                    Animated wallpapers run continuously behind the chat UI. GIFs can use more GPU,
                    memory, and battery than a still background.
                  </div>
                  <div className="block">You can switch back anytime from Settings or the background menu.</div>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="rounded-xl"
            onClick={() => {
              onCancel();
              onOpenChange(false);
            }}
          >
            Go back
          </AlertDialogCancel>
          <AlertDialogAction
            className="rounded-xl"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
              onOpenChange(false);
            }}
          >
            Use anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
