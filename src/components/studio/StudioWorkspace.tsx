import { useMemo, useCallback } from 'react';
import StudioCanvas from '@/src/components/studio/StudioCanvas';
import { useStudioStore, useChatStore } from '@/src/store/index';
import { parseLenientJson } from '@/src/lib/jsonParser';
import type { PaletteNode } from '@/src/store/studioSlice';
import type { Message } from '@/src/types/chat';
import { cn } from '@/lib/utils';

interface StudioWorkspaceProps {
  messages: Message[];
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
}

export function StudioWorkspace({ messages, setMessages }: StudioWorkspaceProps) {
  const nodes = useStudioStore(state => state.nodes);
  const studioStreamBuffer = useStudioStore(state => state.studioStreamBuffer);
  const updateNodePosition = useStudioStore(state => state.updateNodePosition);
  const setRefinementNodeId = useStudioStore(state => state.setRefinementNodeId);
  
  const setInput = useChatStore(state => state.setInput);
  const setActiveWorkspace = useChatStore(state => state.setActiveWorkspace);

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
    let text = `I'd like to discuss this color palette from the Studio:\n\n`;
    text += `**Theme**: ${p.theme || 'Untitled'}\n`;
    if (p.description) text += `**Description**: ${p.description}\n`;
    text += `\n**Colors**:\n`;
    p.colors.forEach(c => {
      text += `- ${c.name}: \`${c.hex}\`${c.wcag ? ` (WCAG: ${c.wcag})` : ''}\n`;
    });

    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      metadata: { timestamp: new Date() }
    };

    setMessages((prev: Message[]) => [...prev, newMessage]);
    setActiveWorkspace('chat');
    setInput('');
  }, [setMessages, setActiveWorkspace, setInput]);

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
