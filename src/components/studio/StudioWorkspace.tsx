import { useMemo, useCallback, useState, useEffect } from 'react';
import { invoke } from "@tauri-apps/api/core";
import StudioCanvas from '@/src/components/studio/StudioCanvas';
import { useStudioStore, useChatStore } from '@/src/store/index';
import { parseLenientJson } from '@/src/lib/jsonParser';
import { isLocalInferenceProvider } from '@/src/lib/providers';
import type { PaletteNode } from '@/src/store/studioSlice';
import type { Message } from '@/src/types/chat';
import { cn } from '@/lib/utils';

interface StudioWorkspaceProps {
  messages: Message[];
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  onSend: () => void;
  isStreaming: boolean;
}

export function StudioWorkspace({ messages, setMessages, onSend, isStreaming }: StudioWorkspaceProps) {
  const nodes = useStudioStore(state => state.nodes);
  const studioStreamBuffer = useStudioStore(state => state.studioStreamBuffer);
  const updateNodePosition = useStudioStore(state => state.updateNodePosition);
  const refinementNodeId = useStudioStore(state => state.refinementNodeId);
  const setRefinementNodeId = useStudioStore(state => state.setRefinementNodeId);
  const addNode = useStudioStore(state => state.addNode);

  // Clear refinement ID when generation finishes so the node is no longer in "skeleton" mode
  useEffect(() => {
    if (!isStreaming && refinementNodeId) {
      setRefinementNodeId(null);
    }
  }, [isStreaming, refinementNodeId, setRefinementNodeId]);
  
  const setInput = useChatStore(state => state.setInput);
  const setActiveWorkspace = useChatStore(state => state.setActiveWorkspace);
  const selectedProvider = useChatStore(state => state.selectedProvider);
  const selectedModel = useChatStore(state => state.selectedModel);
  const isModelLoaded = useChatStore(state => state.isModelLoaded);
  const setIsModelLoading = useChatStore(state => state.setIsModelLoading);

  const [pendingEjectTrigger, setPendingEjectTrigger] = useState(false);
  const [waitingForLoadToRegen, setWaitingForLoadToRegen] = useState(false);

  const streamingNode = useMemo(() => {
    if (!studioStreamBuffer) return null;
    const parsed = parseLenientJson(studioStreamBuffer);
    if (!parsed) return null;
    return {
      id: 'streaming-node',
      position: { x: 100 + nodes.length * 320, y: 300 },
      palette: parsed,
      createdAt: Date.now(),
      sourcePrompt: ''
    };
  }, [studioStreamBuffer, nodes.length]);

  const handleRefineNode = (node: any) => {
    setRefinementNodeId(node.id);
    const variationPrompt = `${node.sourcePrompt}\n\nChange it up. Create a unique variation while keeping the core theme.`;
    setInput(variationPrompt);
    
    if (isLocalInferenceProvider(selectedProvider) && !isModelLoaded) {
      invoke('preload_model', { provider: selectedProvider, modelId: selectedModel });
      setIsModelLoading(true);
      setWaitingForLoadToRegen(true);
    } else {
      // Small timeout to ensure input state is synced with useChatEngine's inputRef
      setTimeout(() => onSend(), 50);
    }
  };

  useEffect(() => {
    if (waitingForLoadToRegen && isModelLoaded) {
      setWaitingForLoadToRegen(false);
      onSend();
    }
  }, [waitingForLoadToRegen, isModelLoaded, onSend]);

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

    setActiveWorkspace('chat');
    setInput(text);
    setPendingEjectTrigger(true);
  }, [setActiveWorkspace, setInput]);

  // Effect to trigger AI response after the workspace switch and message injection
  useEffect(() => {
    if (pendingEjectTrigger) {
      // Small timeout ensures Dashboard.tsx completes its render cycle 
      // and updates inputRef.current with the newly set input text.
      const timer = setTimeout(() => {
        onSend();
      }, 100);
      setPendingEjectTrigger(false);
      return () => clearTimeout(timer);
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
        isStreaming={isStreaming}
        refinementNodeId={refinementNodeId}
      />
    </div>
  );
}
