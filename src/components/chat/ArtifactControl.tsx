import React from 'react';
import { FileCode2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ArtifactControlProps {
  isArtifactToolActive: boolean;
  setIsArtifactToolActive: (val: boolean) => void;
}

export const ArtifactControl = ({
  isArtifactToolActive,
  setIsArtifactToolActive,
}: ArtifactControlProps) => {
  const statusLabel = isArtifactToolActive
    ? 'Artifact Tool enabled'
    : 'Artifact Tool disabled';
  const actionLabel = isArtifactToolActive
    ? 'Disable artifact tool'
    : 'Enable artifact tool';

  const handleToggleArtifactTool = (): void => {
    const nextState = !isArtifactToolActive;
    setIsArtifactToolActive(nextState);
    toast(nextState ? 'Artifact Tool enabled' : 'Artifact Tool disabled');
  };

  return (
    <Tooltip>
      <TooltipTrigger render={(props) => (
        <Button
          {...props}
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 rounded-lg transition-all hover:-translate-y-0.5 active:scale-95',
            isArtifactToolActive
              ? 'text-violet-500 bg-violet-500/10 hover:bg-violet-500/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          )}
          onClick={handleToggleArtifactTool}
          aria-pressed={isArtifactToolActive}
          aria-label={actionLabel}
        >
          <FileCode2 className="h-4 w-4" />
        </Button>
      )} />
      <TooltipContent side="top" className="text-[11px] py-1.5 px-2.5">
        {statusLabel}
      </TooltipContent>
    </Tooltip>
  );
};
