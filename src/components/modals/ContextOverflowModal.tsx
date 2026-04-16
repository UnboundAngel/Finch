import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from 'lucide-react';

interface ContextOverflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  hardwareSafeLimit: number;
  requestedTokens: number;
}

export const ContextOverflowModal = ({
  isOpen,
  onClose,
  onConfirm,
  hardwareSafeLimit,
  requestedTokens
}: ContextOverflowModalProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md border-amber-500/20 shadow-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <AlertDialogTitle className="text-xl font-bold tracking-tight">Hardware Limit Warning</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left text-sm leading-relaxed text-muted-foreground pt-2">
            You're requesting <span className="font-bold text-foreground">{requestedTokens.toLocaleString()}</span> tokens, but your current hardware (RAM) is estimated to handle up to <span className="font-bold text-emerald-500">{hardwareSafeLimit.toLocaleString()}</span> safely.
            <br /><br />
            Exceeding this limit may cause significant system slowdown, model failure (Out of Memory), or complete system instability.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 pt-4 border-t border-white/5">
          <AlertDialogCancel onClick={onClose} className="rounded-full border-white/10 hover:bg-white/5">
            Adjust Length
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20"
          >
            Proceed Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
