import { useMemo, useCallback, useState, useEffect } from 'react';
import StudioCanvas from '@/src/components/studio/StudioCanvas';
import { useStudioStore, useChatStore } from '@/src/store/index';
import { parseLenientJson } from '@/src/lib/jsonParser';
import type { PaletteNode } from '@/src/store/studioSlice';
import type { Message } from '@/src/types/chat';
import { cn } from '@/lib/utils';

interface StudioWorkspaceProps {
  messages: Message[];
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  onSend: () => void;
}

export function StudioWorkspace({ messages, setMessages, onSend }: StudioWorkspaceProps) {
  const nodes = useStudioStore(state => state.nodes);
  const studioStreamBuffer = useStudioStore(state => state.studioStreamBuffer);
  const updateNodePosition = useStudioStore(state => state.updateNodePosition);
  const setRefinementNodeId = useStudioStore(state => state.setRefinementNodeId);
  
  const setInput = useChatStore(state => state.setInput);
  const setActiveWorkspace = useChatStore(state => state.setActiveWorkspace);

  const [pendingEjectTrigger, setPendingEjectTrigger] = useState(false);

  const streamingNode = useMemo(() => {
    if (!studioStreamBuffer) return null;
    const parsed = parseLenientJson(studioStreamBuffer);
    if (!parsed) return null;
    return {
      id: 'streaming-node',
      position: { x: 100 + nodes.length * 320, y: 100 },
      palette: parsed,
      createdAt: Date.now(),
      sourcePrompt: ''
    };
  }, [studioStreamBuffer, nodes.length]);

  const handleRefineNode = (node: any) => {
    setRefinementNodeId(node.id);
    setInput(node.sourcePrompt);
  };

  const handleEjectNode = useCallback((node: PaletteNode) => {
    const p = node.palette;
    const colors = p.colors;
    
    // Detect uniform accessibility
    const allWcag = colors.map(c => c.wcag).filter(Boolean);
    const uniqueWcag = [...new Set(allWcag)];
    const allMatch = uniqueWcag.length === 1 && allWcag.length === colors.length;
    
    let text = `I just ejected a palette from Studio. Here's what I'm working with:\n\n`;
    text += `**${p.theme || 'Untitled Palette'}**\n`;
    if (p.description) text += `${p.description}\n`;

    text += `\n`;
    text += `| Color | Hex |\n`;
    text += `|---|---|\n`;

    colors.forEach(c => {
      text += `| ${c.name} | \`${c.hex}\` |\n`;
    });

    text += `\n`;

    // Accessibility Quality Stamp
    if (allMatch) {
      text += `✓ All colors meet WCAG ${uniqueWcag[0]} accessibility standards\n\n`;
    } else if (uniqueWcag.length > 0) {
      text += `ℹ️ Mixed accessibility standards (AA to AAA)\n\n`;
    }

    text += `What could we do with this pallete?`;

    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      metadata: { timestamp: new Date() }
    };

    setMessages((prev: Message[]) => [...prev, newMessage]);
    setActiveWorkspace('chat');
    setInput('');
    setPendingEjectTrigger(true);
  }, [setMessages, setActiveWorkspace, setInput]);

  // Effect to trigger AI response after the workspace switch and message injection
  useEffect(() => {
    if (pendingEjectTrigger) {
      onSend();
      setPendingEjectTrigger(false);
    }
  }, [pendingEjectTrigger, onSend]);

// INTEGRATION
  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-[#0A0A0B]">
      <StudioCanvas 
        nodes={nodes} 
        streamingNode={streamingNode} 
        onNodeMove={updateNodePosition} 
        onRefineNode={handleRefineNode}
        onEjectNode={handleEjectNode}
      />
    </div>
  );
}
