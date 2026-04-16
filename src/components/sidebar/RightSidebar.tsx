import React from 'react';
import { useModelParams, useChatStore } from '@/src/store';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Import extracted components
import { SystemPromptSection } from './components/SystemPromptSection';
import { SamplingSection } from './components/SamplingSection';
import { OutputSection } from './components/OutputSection';
import { StopWordsSection } from './components/StopWordsSection';
import { useSidebarTheme } from './hooks/useSidebarTheme';

interface RightSidebarProps {
  isOpen: boolean;
  readyToFetch?: boolean;
  isPinkMode?: boolean;
  contrast?: 'light' | 'dark';
}

export const RightSidebar = ({ isOpen, readyToFetch, isPinkMode, contrast }: RightSidebarProps) => {
  const fetchContextIntelligence = useModelParams(state => state.fetchContextIntelligence);
  const selectedModel = useChatStore((state) => state.selectedModel);
  const selectedProvider = useChatStore((state) => state.selectedProvider);

  const [isPromptOpen, setIsPromptOpen] = React.useState(true);
  const [isSamplingOpen, setIsSamplingOpen] = React.useState(true);
  const [isOutputOpen, setIsOutputOpen] = React.useState(true);

  const { textColor, mutedTextColor, borderColor } = useSidebarTheme(isPinkMode, contrast);

  React.useEffect(() => {
    // Only fetch if sidebar is open AND animation is finished
    if (selectedProvider && selectedModel && isOpen && readyToFetch) {
      fetchContextIntelligence(selectedProvider, selectedModel);
    }
  }, [selectedProvider, selectedModel, isOpen, readyToFetch, fetchContextIntelligence]);

  return (
    <aside
      className={cn(
        "h-full w-[300px] flex flex-col transition-opacity duration-300 ease-in-out relative overflow-hidden",
        isOpen ? "opacity-100" : "opacity-0",
        borderColor
      )}
    >
      <div className="absolute inset-0 w-[300px] flex flex-col min-h-0">
        <TooltipProvider delay={200}>
          <ScrollArea className="flex-1 w-full h-full scrollbar-thin">
            <div className="py-4 space-y-0 relative">
              {/* Header */}
              <div className="space-y-1 px-5 pb-6 pt-2">
                <h2 className={cn("text-[10px] font-bold uppercase tracking-[0.4em] transition-colors duration-300", textColor)}>Parameters</h2>
                <p className={cn("text-[9px] leading-relaxed transition-colors duration-300", mutedTextColor)}>
                  Global configuration for all AI interactions.
                </p>
              </div>

              <SystemPromptSection 
                isOpen={isPromptOpen}
                onToggle={() => setIsPromptOpen(!isPromptOpen)}
                isPinkMode={isPinkMode}
                contrast={contrast}
              />

              <SamplingSection 
                isOpen={isSamplingOpen}
                onToggle={() => setIsSamplingOpen(!isSamplingOpen)}
                isPinkMode={isPinkMode}
                contrast={contrast}
              />

              <OutputSection 
                isOpen={isOutputOpen}
                onToggle={() => setIsOutputOpen(!isOutputOpen)}
                isPinkMode={isPinkMode}
                contrast={contrast}
              />

              <StopWordsSection 
                isPinkMode={isPinkMode}
                contrast={contrast}
              />
            </div>
          </ScrollArea>
        </TooltipProvider>
      </div>
    </aside>
  );
};
