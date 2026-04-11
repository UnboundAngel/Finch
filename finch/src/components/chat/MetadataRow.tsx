import React from 'react';
import { Bot, Timer, Zap, Hash, Clock, AlertTriangle } from 'lucide-react';
import { MessageMetadata } from '@/src/types/chat';

export const MetadataRow = ({ metadata, isLatest }: { metadata: MessageMetadata, isLatest: boolean }) => {
  return (
    <div className={`text-xs text-muted-foreground/60 flex flex-wrap items-center gap-5 mt-2 transition-opacity duration-300 ${isLatest ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
      {metadata.model && (
        <div className="flex items-center gap-1.5">
          <Bot className="h-3 w-3" />
          <span>{metadata.model}</span>
        </div>
      )}
      {metadata.timeToFirstToken !== undefined && (
        <div className="flex items-center gap-1.5">
          <Timer className="h-3 w-3" />
          <span>{metadata.timeToFirstToken}ms</span>
        </div>
      )}
      {metadata.tokensPerSecond !== undefined && (
        <div className="flex items-center gap-1.5">
          <Zap className="h-3 w-3" />
          <span>{metadata.tokensPerSecond} t/s</span>
        </div>
      )}
      {metadata.completionTokens !== undefined && (
        <div className="flex items-center gap-1.5">
          <Hash className="h-3 w-3" />
          <span>{metadata.completionTokens}</span>
        </div>
      )}
      {metadata.totalDuration !== undefined && (
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span>{(metadata.totalDuration / 1000).toFixed(1)}s</span>
        </div>
      )}
      {metadata.stopReason === 'length' && (
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          <span>cut off</span>
        </div>
      )}
    </div>
  );
};
