import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Switch from '@/components/ui/sky-toggle';
import { toast } from 'sonner';
import { Message, ChatSession } from '../../types/chat';

interface SettingsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isDark: boolean;
  onThemeChange: (checked: boolean) => void;
  enterToSend: boolean;
  setEnterToSend: (enter: boolean) => void;
  setMessages: (messages: Message[]) => void;
  setRecentChats: (chats: ChatSession[]) => void;
  setActiveSessionId: (id: string | null) => void;
}

export const SettingsDialog = ({
  isOpen,
  onOpenChange,
  isDark,
  onThemeChange,
  enterToSend,
  setEnterToSend,
  setMessages,
  setRecentChats,
  setActiveSessionId,
}: SettingsDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Settings</DialogTitle>
          <DialogDescription>
            Customize your app experience and preferences.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Appearance</h4>
            <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/10">
              <div className="flex flex-col gap-1">
                <span className="font-medium">Theme</span>
                <span className="text-xs text-muted-foreground">Toggle between light and dark mode</span>
              </div>
              <Switch checked={isDark} onChange={onThemeChange} />
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Chat</h4>
            <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/10">
              <div className="flex flex-col gap-1">
                <span className="font-medium">Enter to Send</span>
                <span className="text-xs text-muted-foreground">Send messages by pressing Enter</span>
              </div>
              <input 
                type="checkbox" 
                checked={enterToSend} 
                onChange={(e) => {
                  setEnterToSend(e.target.checked);
                }} 
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-destructive uppercase tracking-wider">Danger Zone</h4>
            <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-xl bg-destructive/5">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-destructive">Clear All Conversations</span>
                <span className="text-xs text-muted-foreground">Permanently delete all your chat history. This action cannot be undone.</span>
              </div>
              <Button variant="destructive" size="sm" className="rounded-lg" onClick={() => {
                if (window.confirm("Are you sure you want to delete all your chat history? This action cannot be undone.")) {
                  setMessages([]);
                  setRecentChats([]);
                  setActiveSessionId(null);
                  toast.error('All chat history cleared');
                  onOpenChange(false);
                }
              }}>Clear All</Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={() => onOpenChange(false)} className="rounded-xl">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
