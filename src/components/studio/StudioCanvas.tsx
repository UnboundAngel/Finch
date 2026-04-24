import React, { useState, useRef, useCallback, useEffect, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { PaletteNode } from '@/src/store/studioSlice';
import type { ParsedPalette } from '@/src/lib/jsonParser';
export interface StudioCanvasProps {
  nodes: PaletteNode[];
  streamingNode?: PaletteNode | null;
  onNodeMove: (id: string, position: { x: number; y: number }) => void;
  onNodeResize?: (id: string, width: number) => void;
  onSaveNode?: (id: string) => void;
  onRefineNode?: (node: PaletteNode) => void;
}

type DragInfo =
  | { type: 'pan'; startX: number; startY: number; initialPanX: number; initialPanY: number }
  | { type: 'marquee'; startX: number; startY: number; currentX: number; currentY: number; initialSelection: Set<string>; initialRects: { id: string; rect: DOMRect }[] }
  | { type: 'node'; nodeIds: string[]; startX: number; startY: number; initialPositions: { [id: string]: { x: number; y: number } } }
  | { type: 'resize'; nodeId: string; startX: number; startY: number; initialWidth: number };

const getRelativeTime = (timestamp: number) => {
  const diff = (Date.now() + 1000) - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const PaletteNodeCard = React.memo(forwardRef<HTMLDivElement, {
  node: PaletteNode;
  isSelected: boolean;
  isStreaming: boolean;
  width: number;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>, node: PaletteNode) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onResizePointerDown: (e: React.PointerEvent<HTMLDivElement>, node: PaletteNode) => void;
  onSaveNode?: (nodeId: string) => void;
  onRefineNode?: (node: PaletteNode) => void;
}>((props, ref) => {
  const { node, isSelected, isStreaming, width, onPointerDown, onPointerUp, onResizePointerDown, onSaveNode, onRefineNode } = props;

  const [editedTitle, setEditedTitle] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const title = editedTitle ?? (node.palette.theme || 'Untitled Theme');
  const colorCount = node.palette.colors.length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(current => current === msg ? null : current);
    }, 2000);
  };

  const handleCopyHex = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    showToast(`Copied ${hex}`);
    setTimeout(() => {
      setCopiedHex(current => current === hex ? null : current);
    }, 1500);
  };

  return (
    <div
      data-node-id={node.id}
      ref={ref}
      className={cn(
        "absolute bg-card text-card-foreground border border-border rounded-2xl p-5 select-none origin-top-left cursor-grab transition-[border-color,box-shadow] duration-200 box-border",
        "hover:border-ring shadow-sm",
        isSelected && "border-primary ring-1 ring-primary shadow-lg",
        isStreaming && "animate-pulse pointer-events-none border-primary"
      )}
      onPointerDown={isStreaming ? undefined : (e) => onPointerDown(e, node)}
      onPointerUp={onPointerUp}
      style={{
        width: `${width}px`,
        transform: `translate(${node.position.x}px, ${node.position.y}px)`,
      }}
    >
      {toastMessage && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-foreground text-background px-3 py-1.5 rounded-full text-[11px] font-medium shadow-md z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMessage}
        </div>
      )}
      {/* INTEGRATION */}
      {isStreaming ? (
        <div className="flex flex-col h-full w-full">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0 space-y-2 py-0.5">
              <div className="h-[18px] w-3/5 bg-muted rounded" />
              <div className="h-[14px] w-2/5 bg-muted/50 rounded" />
            </div>
            <div className="h-5 w-16 bg-muted rounded-full" />
          </div>

          <div className="flex gap-2 mt-5">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex-1 aspect-square rounded-lg bg-muted" />
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex-1 h-[22px] bg-muted/50 rounded" />
            ))}
          </div>

          <div className="h-px bg-border/50 my-3" />
          <div className="flex gap-1.5">
            <div className="h-4 w-12 bg-muted/50 rounded" />
            <div className="h-4 w-16 bg-muted/50 rounded" />
            <div className="h-4 w-14 bg-muted/50 rounded" />
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  autoFocus
                  defaultValue={title}
                  onBlur={(e) => { setEditedTitle(e.target.value); setIsEditing(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setEditedTitle(e.currentTarget.value); setIsEditing(false); } e.stopPropagation(); }}
                  onPointerDown={e => { e.stopPropagation(); }}
                  className="text-foreground font-semibold text-[15px] font-sans w-full border border-border rounded px-1 outline-none bg-background focus:ring-1 focus:ring-ring"
                />
              ) : (
                <div 
                  onDoubleClick={() => !isStreaming && setIsEditing(true)} 
                  className="flex items-center gap-1.5 text-foreground font-semibold text-[15px] font-sans cursor-text"
                  title="Double click to edit"
                >
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">{title}</span>
                  {!isStreaming && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                      onPointerDown={e => e.stopPropagation()} 
                      className="bg-transparent border-none cursor-pointer text-muted-foreground p-0.5 flex items-center hover:text-foreground transition-colors"
                      title="Rename"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-muted-foreground text-[11px] font-sans">Generated &middot; {getRelativeTime(node.createdAt)}</span>
              </div>
            </div>
            <div className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-[11px] font-medium font-sans whitespace-nowrap">{colorCount} colors</div>
          </div>

          <div className="flex gap-2 mt-5">
            {node.palette.colors.map((c, i) => (
              <div 
                key={i} 
                title={`Copy ${c.hex}`} 
                onClick={() => handleCopyHex(c.hex)} 
                onPointerDown={e => e.stopPropagation()} 
                className="flex-1 aspect-square rounded-lg shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] cursor-copy flex items-center justify-center transition-transform hover:scale-105"
                style={{ backgroundColor: c.hex }}
              >
                {copiedHex === c.hex && <svg className="drop-shadow-md animate-in zoom-in-50 duration-200" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            {node.palette.colors.map((c, i) => (
              <div 
                key={i} 
                title={`Copy ${c.hex}`} 
                onClick={() => handleCopyHex(c.hex)} 
                onPointerDown={e => e.stopPropagation()} 
                className="flex-1 flex flex-col items-center min-w-0 bg-muted/50 rounded py-1 cursor-copy border border-border/50 hover:bg-muted transition-colors"
              >
                <span className="text-muted-foreground text-[10px] font-mono">{c.hex}</span>
              </div>
            ))}
          </div>

          {(node.palette.description) && (
            <>
              <div className="h-px bg-border/50 my-3" />
              <div className="flex gap-1.5 flex-wrap">
                {(node.palette.description?.split(',').slice(0, 3))?.map((tag, i) => (
                  <span key={i} className="text-muted-foreground text-[11px] font-sans">#{tag.trim().toLowerCase()}</span>
                ))}
              </div>
            </>
          )}

          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="text-[12px] text-muted-foreground mb-2 font-medium">Color Breakdown</div>
              {node.palette.colors.map(c => (
                <div key={c.hex} className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]" style={{ backgroundColor: c.hex }} />
                      <span className="text-[12px] text-foreground font-medium">{c.name}</span>
                  </div>
                  <span className="text-[12px] text-muted-foreground font-mono">{c.hex}</span>
                </div>
              ))}
            </div>
          )}

          {!isStreaming && (
            <div className="flex justify-between items-center mt-4">
              <div className="flex-1">
                <button 
                  className="bg-primary/10 text-primary border-none cursor-pointer px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all hover:bg-primary/20 hover:scale-105 active:scale-95"
                  onClick={(e) => { e.stopPropagation(); onRefineNode?.(node); }}
                  onPointerDown={e => e.stopPropagation()}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                  Refine
                </button>
              </div>
              <div className="flex gap-2">
                <button className="bg-transparent border-none cursor-pointer text-muted-foreground p-1.5 rounded-md flex items-center justify-center transition-colors hover:bg-muted hover:text-foreground" onClick={(e) => { e.stopPropagation(); setIsExpanded(prev => !prev); }} onPointerDown={e => e.stopPropagation()}>
                  {isExpanded ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l7-7 7 7M5 15l7 7 7-7"/></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>}
                </button>
                <button className="bg-transparent border-none cursor-pointer text-muted-foreground p-1.5 rounded-md flex items-center justify-center transition-colors hover:bg-muted hover:text-foreground" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(JSON.stringify(node.palette, null, 2)); showToast("Copied JSON!"); }} onPointerDown={e => e.stopPropagation()}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
                <button className="bg-transparent border-none cursor-pointer text-muted-foreground p-1.5 rounded-md flex items-center justify-center transition-colors hover:bg-muted hover:text-foreground" onClick={(e) => { e.stopPropagation(); onSaveNode?.(node.id); showToast("Saved to library!"); }} onPointerDown={e => e.stopPropagation()}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></button>
              </div>
            </div>
          )}
        </>
      )}
      {!isStreaming && (
        <div onPointerDown={(e) => onResizePointerDown(e, node)} onPointerUp={onPointerUp} className="absolute right-0 bottom-0 w-4 h-4 cursor-ew-resize flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 1L7 7L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      )}
    </div>
  );
}));

export default function StudioCanvas(props: StudioCanvasProps): React.JSX.Element {
  const { nodes, streamingNode, onNodeMove, onNodeResize, onSaveNode, onRefineNode } = props;
  
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});

  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [nodeWidths, setNodeWidths] = useState<Record<string, number>>({});
  
  const dragInfo = useRef<DragInfo | null>(null);

  useEffect(() => {
    const map: Record<string, number> = {};
    nodes.forEach(n => { if (n.width) map[n.id] = n.width; });
    setNodeWidths(prev => ({ ...prev, ...map }));
  }, [nodes]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 1) {
      e.preventDefault();
      containerRef.current?.setPointerCapture(e.pointerId);
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
      dragInfo.current = {
        type: 'pan',
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: panOffset.x,
        initialPanY: panOffset.y
      };
      return;
    }

    if (e.button === 0 && e.target === containerRef.current) {
      e.preventDefault();
      containerRef.current?.setPointerCapture(e.pointerId);
      const initialSelection = e.shiftKey ? new Set(selectedIds) : new Set<string>();
      if (!e.shiftKey) setSelectedIds(new Set());
      
      const initialRects: { id: string; rect: DOMRect }[] = [];
      nodes.forEach(node => {
        const el = nodeRefs.current[node.id];
        if (el) initialRects.push({ id: node.id, rect: el.getBoundingClientRect() });
      });

      dragInfo.current = {
        type: 'marquee',
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        initialSelection,
        initialRects
      };
    }
  }, [panOffset, selectedIds, nodes]);

  const handleNodePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, node: PaletteNode) => {
    if (e.button === 1) return;
    if (e.button !== 0) return;
    
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    
    let newSelection = new Set(selectedIds);
    if (!newSelection.has(node.id)) {
      if (!e.shiftKey) newSelection = new Set([node.id]);
      else newSelection.add(node.id);
      setSelectedIds(newSelection);
    } else if (e.shiftKey) {
      newSelection.delete(node.id);
      setSelectedIds(newSelection);
      return; 
    }

    const initialPositions: Record<string, { x: number, y: number }> = {};
    const toDrag = newSelection.has(node.id) ? Array.from(newSelection) : [node.id];
    
    toDrag.forEach((id: string) => {
      const n = nodes.find(n => n.id === id);
      if (n) initialPositions[id] = { ...n.position };
    });

    dragInfo.current = {
      type: 'node',
      nodeIds: toDrag,
      startX: e.clientX,
      startY: e.clientY,
      initialPositions
    };
  }, [selectedIds, nodes]);

  const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, node: PaletteNode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const initialWidth = nodeWidths[node.id] || 320;
    dragInfo.current = {
      type: 'resize',
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      initialWidth
    };
  }, [nodeWidths]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const info = dragInfo.current;
    if (!info) return;

    const dx = e.clientX - info.startX;
    const dy = e.clientY - info.startY;

    if (info.type === 'pan') {
      const newX = info.initialPanX + dx;
      const newY = info.initialPanY + dy;
      if (worldRef.current) worldRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
      // INTEGRATION
      if (containerRef.current) containerRef.current.style.backgroundPosition = `${newX}px ${newY}px`;
    } else if (info.type === 'marquee') {
      info.currentX = e.clientX;
      info.currentY = e.clientY;
      if (marqueeRef.current) {
        const left = Math.min(info.startX, e.clientX);
        const top = Math.min(info.startY, e.clientY);
        const width = Math.abs(dx);
        const height = Math.abs(dy);
        Object.assign(marqueeRef.current.style, {
          display: 'block',
          left: `${left}px`, top: `${top}px`,
          width: `${width}px`, height: `${height}px`
        });

        const screenMarquee = {
          left, right: left + width, top, bottom: top + height
        };
        const newlySelected = new Set(info.initialSelection);
        info.initialRects.forEach(({ id, rect }) => {
          const overlap = !(rect.right < screenMarquee.left || rect.left > screenMarquee.right || 
                            rect.bottom < screenMarquee.top || rect.top > screenMarquee.bottom);
          if (overlap) newlySelected.add(id);
        });
        setSelectedIds(newlySelected);
      }
    } else if (info.type === 'node') {
      info.nodeIds.forEach(id => {
        const el = nodeRefs.current[id];
        const initial = info.initialPositions[id];
        if (el && initial) {
          el.style.transform = `translate(${initial.x + dx}px, ${initial.y + dy}px) scale(1.02)`;
          el.style.zIndex = '10';
        }
      });
    } else if (info.type === 'resize') {
      const newWidth = Math.max(280, info.initialWidth + dx);
      const el = nodeRefs.current[info.nodeId];
      if (el) el.style.width = `${newWidth}px`;
    }
  }, [nodes]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const info = dragInfo.current;
    if (!info) return;

    if (info.type === 'pan') {
      setPanOffset({ x: info.initialPanX + (e.clientX - info.startX), y: info.initialPanY + (e.clientY - info.startY) });
      if (containerRef.current) containerRef.current.style.cursor = 'default';
    } 
    else if (info.type === 'marquee') {
      if (marqueeRef.current) marqueeRef.current.style.display = 'none';
    } 
    else if (info.type === 'node') {
      const dx = e.clientX - info.startX;
      const dy = e.clientY - info.startY;
      info.nodeIds.forEach(id => {
        const el = nodeRefs.current[id];
        if (el) {
          el.style.transform = `translate(${info.initialPositions[id].x + dx}px, ${info.initialPositions[id].y + dy}px)`;
          el.style.zIndex = '';
        }
        if (dx !== 0 || dy !== 0) onNodeMove(id, { x: info.initialPositions[id].x + dx, y: info.initialPositions[id].y + dy });
      });
    }
    else if (info.type === 'resize') {
      const newWidth = Math.max(280, info.initialWidth + (e.clientX - info.startX));
      setNodeWidths(prev => ({ ...prev, [info.nodeId]: newWidth }));
      if (onNodeResize) onNodeResize(info.nodeId, newWidth);
    }
    
    dragInfo.current = null;
  }, [onNodeMove, onNodeResize]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) return;
    setPanOffset(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      // INTEGRATION
      className="relative overflow-hidden w-full h-full bg-transparent touch-none"
      style={{
        backgroundImage: 'radial-gradient(#ffffff10 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        backgroundPosition: `${panOffset.x}px ${panOffset.y}px`
      }}
    >
      <div 
        ref={worldRef} 
        className="absolute top-0 left-0 w-0 h-0"
        style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
      >
        {nodes.map(node => (
          <PaletteNodeCard
            key={node.id}
            node={node}
            ref={el => { if (el) nodeRefs.current[node.id] = el; else delete nodeRefs.current[node.id]; }}
            isSelected={selectedIds.has(node.id)}
            isStreaming={false}
            width={nodeWidths[node.id] || node.width || 320}
            onPointerDown={handleNodePointerDown}
            onPointerUp={handlePointerUp}
            onResizePointerDown={handleResizePointerDown}
            onSaveNode={onSaveNode}
            onRefineNode={onRefineNode}
          />
        ))}
        {streamingNode && (
          <PaletteNodeCard
            key={streamingNode.id}
            node={streamingNode as PaletteNode}
            ref={el => { if (el) nodeRefs.current[streamingNode.id] = el; else delete nodeRefs.current[streamingNode.id]; }}
            isSelected={false}
            isStreaming={true}
            width={nodeWidths[streamingNode.id] || streamingNode.width || 320}
            onPointerDown={handleNodePointerDown}
            onPointerUp={handlePointerUp}
            onResizePointerDown={handleResizePointerDown}
            onSaveNode={onSaveNode}
          />
        )}
      </div>

      <div 
        ref={marqueeRef} 
        className="absolute hidden border border-primary bg-primary/10 pointer-events-none z-[9999]"
      />
    </div>
  );
}
