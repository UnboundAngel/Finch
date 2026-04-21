"use client";

import { useState } from 'react';
import { Binoculars, Check, Clock, ChevronDown, ChevronUp, ExternalLink as ExternalLinkIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { ExternalLink } from '@/src/components/ui/ExternalLink';

interface SearchEvent {
  type: 'search_start' | 'search_source' | 'search_done';
  data?: any;
}

interface SearchStatusProps {
  events: SearchEvent[];
  isThinking?: boolean;
}

export const SearchStatus = ({ events, isThinking }: SearchStatusProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (events.length === 0) return null;

  const startEvent = events.find(e => e.type === 'search_start');
  const query = startEvent?.data?.query || "Web Research";
  const sources = events.filter(e => e.type === 'search_source').map(e => e.data);
  const isDone = events.some(e => e.type === 'search_done');

  return (
    <div className="mb-4">
      <div 
        className={cn(
          "inline-flex flex-col min-w-[300px] max-w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 shadow-xl overflow-hidden",
          !isExpanded && "rounded-full"
        )}
      >
        {/* Header/Pill */}
        <div 
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-1.5 rounded-lg bg-blue-500/10 text-blue-400",
              !isDone && "animate-pulse"
            )}>
              <Binoculars className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-foreground/90 leading-none">
                {isDone ? "Research complete" : "Searching the web..."}
              </span>
              {isExpanded && (
                <span className="text-[11px] text-muted-foreground mt-1 truncate max-w-[200px]">
                  {query}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isExpanded && sources.length > 0 && (
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-medium">
                {sources.length} sources
              </span>
            )}
            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </div>

        {/* Content Log */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            isExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground pb-1">
                  <div className="h-1 w-1 rounded-full bg-blue-400 animate-ping" />
                  <span>Activity Log</span>
                </div>
                
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {sources.map((source, i) => {
                    let domain = "";
                    try {
                      domain = new URL(source.url).hostname;
                    } catch (e) {}

                    return (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between group py-1"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="h-5 w-5 rounded flex items-center justify-center bg-white/5 shrink-0 overflow-hidden">
                            {domain ? (
                              <>
                                <img
                                  src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
                                  className="h-3.5 w-3.5 object-contain"
                                  alt=""
                                  onError={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    img.style.display = 'none';
                                    const fallback = img.nextSibling as HTMLElement | null;
                                    if (fallback) fallback.style.display = '';
                                  }}
                                />
                                <span style={{ display: 'none' }}>
                                  <Check className="h-3 w-3 text-emerald-400" />
                                </span>
                              </>
                            ) : (
                              <Check className="h-3 w-3 text-emerald-400" />
                            )}
                          </div>
                          <span className="text-[12px] text-foreground/80 truncate">
                            {source.title}
                          </span>
                          <ExternalLink 
                            href={source.url} 
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-blue-400"
                          >
                            <ExternalLinkIcon className="h-3 w-3" />
                          </ExternalLink>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          <Clock className="h-3 w-3 text-muted-foreground/60" />
                          <span className="text-[10px] font-mono text-muted-foreground/60">
                            {(source.duration_ms / 1000).toFixed(1)}s
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {!isDone && (
                    <div className="flex items-center gap-3 py-2 opacity-50">
                      <div className="h-5 w-5 rounded flex items-center justify-center animate-spin border-2 border-primary/20 border-t-primary" />
                      <span className="text-[12px] animate-pulse">Fetching more sources...</span>
                    </div>
                  )}
                </div>
          </div>
        </div>
      </div>
    </div>
  );
};
