import React from 'react';
import { Bot, Timer, Zap, Hash, Clock, AlertTriangle, HelpCircle, Copy, Check } from 'lucide-react';
import { MessageMetadata } from '@/src/types/chat';
import { motion, AnimatePresence } from 'framer-motion';
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
}

export const MetadataRow = ({ metadata, isLatest }: MetadataRowProps) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    const statsJson = JSON.stringify(metadata, null, 2);
    navigator.clipboard.writeText(statsJson);
    setCopied(true);
    toast.success('Stats copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const getStopReasonIcon = (reason?: string) => {
    switch (reason) {
      case 'max_tokens':
        return <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />;
      case 'abort':
        return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
      default:
        return <Check className="h-3.5 w-3.5 text-green-500" />;
    }
  };

  const formatStopReason = (reason?: string) => {
    if (!reason) return 'complete';
    return reason.replace('_', ' ');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ 
        opacity: isLatest ? 1 : undefined, 
        y: isLatest ? 0 : undefined 
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`text-[10px] sm:text-xs text-muted-foreground/60 flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 transition-opacity duration-300 ${isLatest ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
    >
      {/* Performance Summary */}
      <div className="flex items-center gap-3 bg-muted/30 px-2.5 py-1 rounded-full border border-muted-foreground/5 shadow-sm">
        {metadata.tokensPerSecond !== undefined && (
          <div className="flex items-center gap-1.5" title="Tokens per second">
            <Zap className="h-3 w-3 text-yellow-500/70" />
            <span className="font-medium">{metadata.tokensPerSecond} <span className="opacity-60 font-normal">t/s</span></span>
          </div>
        )}
        
        <div className="w-px h-3 bg-muted-foreground/20" />
        
        {metadata.totalTokens !== undefined && (
          <div className="flex items-center gap-1.5" title="Total tokens">
            <Hash className="h-3 w-3 text-blue-500/70" />
            <span className="font-medium">{metadata.totalTokens} <span className="opacity-60 font-normal">tokens</span></span>
          </div>
        )}

        <div className="w-px h-3 bg-muted-foreground/20" />

        <div className="flex items-center gap-1.5" title="Stop reason">
          {getStopReasonIcon(metadata.stopReason)}
          <span className="font-medium">{formatStopReason(metadata.stopReason)}</span>
        </div>
      </div>

      {/* Additional Metadata */}
      <div className="flex items-center gap-4">
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

      {/* Tools */}
      <div className="flex items-center gap-1 ml-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ translateY: -2 }} whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted/80">
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs p-0 overflow-hidden rounded-xl border-muted-foreground/20 shadow-xl">
            <div className="bg-muted/50 px-3 py-2 border-b border-muted-foreground/10 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider">Generation Stats</span>
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <div className="h-2 w-2 rounded-full bg-red-500" />
              </div>
            </div>
            <pre className="p-3 text-[10px] font-mono leading-relaxed overflow-auto max-h-[200px] bg-background/50 backdrop-blur-sm">
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileHover={{ translateY: -2 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full hover:bg-muted/80"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-[10px] font-medium">Copy raw stats</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
};
