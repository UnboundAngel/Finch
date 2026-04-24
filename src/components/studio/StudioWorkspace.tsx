import { useMemo } from 'react';
import StudioCanvas from '@/src/components/studio/StudioCanvas';
import { useStudioStore } from '@/src/store/index';
import { parseLenientJson } from '@/src/lib/jsonParser';
import { cn } from '@/lib/utils';

export function StudioWorkspace() {
  const nodes = useStudioStore(state => state.nodes);
  const studioStreamBuffer = useStudioStore(state => state.studioStreamBuffer);
  const updateNodePosition = useStudioStore(state => state.updateNodePosition);

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

// INTEGRATION
  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-[#0A0A0B]">
      <StudioCanvas 
        nodes={nodes} 
        streamingNode={streamingNode} 
        onNodeMove={updateNodePosition} 
      />
    </div>
  );
}
