import 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useProfileStore } from '@/src/store';
import { LogOut } from 'lucide-react';

interface ProfileDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  profileName: string;
  setProfileName: (name: string) => void;
  profileEmail: string;
  setProfileEmail: (email: string) => void;
  onLogout?: () => void;
}

export const ProfileDialog = ({
  isOpen,
  onOpenChange,
  profileName,
  setProfileName,
  profileEmail,
  setProfileEmail,
  onLogout,
}: ProfileDialogProps) => {
  const activeProfile = useProfileStore(state => state.activeProfile);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Profile Settings</DialogTitle>
          <DialogDescription>
            Manage your active profile and account details.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 py-4">
          <div className="flex items-center justify-between gap-4 p-4 border rounded-2xl bg-muted/10">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 rounded-full border-2 border-muted">
                <AvatarImage src={activeProfile?.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces"} alt="User" />
                <AvatarFallback className="text-2xl">{profileName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-semibold text-primary">{profileName}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Active Persona</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors gap-2"
              onClick={() => {
                onOpenChange(false);
                if (onLogout) onLogout();
              }}
            >
              <LogOut className="h-4 w-4" />
              Switch
            </Button>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Display Name</label>
              <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email Address</label>
              <Input value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} type="email" className="rounded-xl" placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Current Plan</label>
              <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/20">
                <div className="flex flex-col">
                  <span className="font-semibold text-primary">Pro Plan</span>
                  <span className="text-xs text-muted-foreground">Billed monthly</span>
                </div>
                <Button variant="secondary" size="sm" className="rounded-lg">Manage</Button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
          <Button onClick={() => { 
            onOpenChange(false); 
            toast.success('Profile updated successfully'); 
          }} className="rounded-xl">Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
