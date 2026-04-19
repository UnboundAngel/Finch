import React from 'react';
import { cn } from '@/lib/utils';
import { Bot, Timer, Gauge, Cpu, Clock, HelpCircle, Copy, Check } from 'lucide-react';
import { MessageMetadata } from '@/src/types/chat';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MetadataRowProps {
  metadata: MessageMetadata;
  isLatest: boolean;
  hasCustomBg?: boolean;
}

export const MetadataRow = ({ metadata, isLatest, hasCustomBg }: MetadataRowProps) => {
  const [copied, setCopied] = React.useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = React.useState(false);

  const handleCopy = () => {
    const statsJson = JSON.stringify(metadata, null, 2);
    navigator.clipboard.writeText(statsJson);
    setCopied(true);
    toast.success('Stats copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (ms?: number) => {
    if (ms === undefined) return null;
    if (ms < 1000) return `${ms}ms`;

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}min`;
    return `${seconds}sec`;
  };

  const isErrorStopReason = (reason?: string) => {
    if (!reason || reason === 'stop' || reason === 'end_turn' || reason === 'complete' || reason === 'user_stopped') return false;
    return true;
  };

  const formatStopReason = (reason?: string) => {
    if (!reason) return 'complete';
    if (reason === 'stop' || reason === 'end_turn') return 'complete';
    return reason.replace('_', ' ');
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{
          opacity: 1,
          y: 0
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "text-[10px] sm:text-xs flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 transition-all duration-300",
          hasCustomBg ? "text-muted-foreground opacity-100 font-medium" : "text-muted-foreground/60"
        )}
      >
        {/* Performance Summary - Hidden by default unless latest or message hovered */}
        <div
          className={`flex items-center gap-4 transition-all duration-300 ${(!isLatest && !isTooltipOpen) ? 'opacity-0 group-hover:opacity-100 transform scale-95 group-hover:scale-100' : 'opacity-100 scale-100'}`}
        >
          {metadata.tokensPerSecond !== undefined && (
            <Tooltip onOpenChange={setIsTooltipOpen}>
              <TooltipTrigger render={(props) => (
                <div {...props} className="flex items-center gap-1.5 cursor-help">
                  <Gauge className="h-3 w-3 text-yellow-500/70" />
                  <span className="font-medium">{metadata.tokensPerSecond} <span className="opacity-60 font-normal">t/s</span></span>
                </div>
              )} />
              <TooltipContent side="bottom">Tokens per second</TooltipContent>
            </Tooltip>
          )}

          {metadata.totalTokens !== undefined && (
            <Tooltip onOpenChange={setIsTooltipOpen}>
              <TooltipTrigger render={(props) => (
                <div {...props} className="flex items-center gap-1.5 cursor-help">
                  <Cpu className="h-3 w-3 text-blue-500/70" />
                  <span className="font-medium">{metadata.totalTokens} <span className="opacity-60 font-normal">tokens</span></span>
                </div>
              )} />
              <TooltipContent side="bottom">Total tokens</TooltipContent>
            </Tooltip>
          )}

          {(metadata.totalDuration !== undefined || metadata.stopReason) && (
            <Tooltip onOpenChange={setIsTooltipOpen}>
              <TooltipTrigger render={(props) => (
                <div {...props} className="flex items-center gap-1.5 cursor-help">
                  <Clock className="h-3 w-3 text-green-500/70" />
                  <span className={`font-medium ${isErrorStopReason(metadata.stopReason) ? 'text-red-500/90' : ''}`}>
                    {isErrorStopReason(metadata.stopReason)
                      ? formatStopReason(metadata.stopReason)
                      : formatDuration(metadata.totalDuration) || 'complete'}
                  </span>
                </div>
              )} />
              <TooltipContent side="bottom">Total generation time</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Additional Metadata */}
        <div className={`flex items-center gap-4 transition-all duration-300 ${(!isLatest && !isTooltipOpen) ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
          {metadata.model && (
            <div className="flex items-center gap-1.5 opacity-80">
              <Bot className="h-3 w-3" />
              <span>{metadata.model}</span>
            </div>
          )}

          {metadata.timeToFirstToken !== undefined && (
            <div className="flex items-center gap-1.5 opacity-80">
              <Timer className="h-3 w-3" />
              <span>{metadata.timeToFirstToken}ms</span>
            </div>
          )}
        </div>

        {/* Tools - Always visible on latest, hover to show on others */}
        <div className={`flex items-center gap-1 ml-auto transition-all duration-300 ${(!isLatest && !isTooltipOpen) ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
          <Tooltip onOpenChange={setIsTooltipOpen}>
            <TooltipTrigger
              render={(renderProps) => (
                <div {...renderProps}>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted/80">
                      <HelpCircle className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                </div>
              )}
            />
            <TooltipContent side="top" className="max-w-xs p-3 rounded-xl border-muted-foreground/20 shadow-xl bg-background/80 backdrop-blur-md">
              <pre className="text-[10px] font-mono leading-relaxed overflow-auto max-h-[200px] text-foreground">
                {JSON.stringify(metadata, null, 2)}
              </pre>
            </TooltipContent>
          </Tooltip>

          <Tooltip onOpenChange={setIsTooltipOpen}>
            <TooltipTrigger
              render={(renderProps) => (
                <div {...renderProps}>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-full hover:bg-muted/80"
                      onClick={handleCopy}
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </motion.div>
                </div>
              )}
            />
            <TooltipContent side="top">
              <p className="text-[10px] font-medium">Copy raw stats</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
