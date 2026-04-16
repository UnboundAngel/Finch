import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ShiningText } from '@/components/ui/shining-text';

export const ThinkingBox = ({ content, isActivelyThinking }: { content?: string, isActivelyThinking?: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mb-2 w-full">
      <div className="flex flex-col items-start">
        <button 
          onClick={() => content && setExpanded(!expanded)}
          className={`flex items-center gap-1 text-xs text-muted-foreground italic transition-colors ${content ? 'hover:text-foreground cursor-pointer' : 'cursor-default'}`}
          disabled={!content}
        >
          {isActivelyThinking ? <ShiningText text="Finch is thinking..." /> : <span>Finch is thinking...</span>}
          {content && (expanded ? <ChevronUp className="h-3.5 w-3.5 not-italic" /> : <ChevronDown className="h-3.5 w-3.5 not-italic" />)}
        </button>
        {content && (
          <div 
            className={`mt-1 text-xs text-muted-foreground border-l-2 border-muted-foreground/20 pl-3 transition-all ${expanded ? 'max-h-[140px] overflow-y-auto' : 'h-auto line-clamp-1 overflow-hidden cursor-pointer hover:text-foreground'}`}
            onClick={() => !expanded && setExpanded(true)}
          >
            <div className="whitespace-pre-wrap">{content}</div>
          </div>
        )}
      </div>
    </div>
  );
};
