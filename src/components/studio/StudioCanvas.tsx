import React, { useState, useRef, useCallback, useEffect, forwardRef } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
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
  onEjectNode?: (node: PaletteNode) => void;
  isStreaming?: boolean;
  refinementNodeId?: string | null;
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
  onEjectNode?: (node: PaletteNode) => void;
  refinementNodeId?: string | null;
  globalIsStreaming?: boolean;
}>((props, ref) => {
  const { node, isSelected, isStreaming, width, onPointerDown, onPointerUp, onResizePointerDown, onSaveNode, onRefineNode, onEjectNode, refinementNodeId, globalIsStreaming } = props;

  const [editedTitle, setEditedTitle] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
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

  useEffect(() => {
    if (isStreaming) {
      setIsRegenerating(false);
      setIsExpanded(false);
    }
  }, [isStreaming]);

  const showSkeleton = isStreaming || isRegenerating || (globalIsStreaming && node.id === refinementNodeId);

  return (
    <div
      data-node-id={node.id}
      ref={ref}
      className={cn(
        "absolute bg-card/70 text-card-foreground border border-border rounded-2xl p-5 select-none origin-top-left transition-[border-color,box-shadow,background-color] duration-300 box-border backdrop-blur-xl",
        !showSkeleton && "group hover:border-ring/50 shadow-xl cursor-grab",
        isSelected && "border-primary ring-1 ring-primary shadow-lg",
        isStreaming && "animate-pulse pointer-events-none border-primary",
        showSkeleton && "cursor-wait"
      )}
      onPointerDown={showSkeleton ? undefined : (e) => onPointerDown(e, node)}
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
      {/* Prismatic Diffusion Regeneration Effect */}
      {showSkeleton && (
        <div 
          className="absolute inset-0 z-50 rounded-2xl overflow-hidden pointer-events-none transition-all duration-700 ease-in-out [contain:paint]"
          style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
        >
          {/* Base Glass Layer with Breathing Blur */}
          <div className="absolute inset-0 backdrop-blur-2xl bg-card/10 animate-glass-pulse" />
          
          {/* Prismatic Light Sweep */}
          <div className="absolute -inset-[100%] opacity-30 bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0%,var(--primary)_10%,transparent_20%,var(--accent)_40%,transparent_50%,var(--primary)_70%,transparent_80%,var(--accent)_90%,transparent_100%)] animate-prismatic-spin blur-3xl" />
          
          {/* Spectral Diffraction Scanning */}
          <div className="absolute inset-0 opacity-[0.15] bg-[linear-gradient(110deg,transparent_20%,var(--primary)_40%,var(--accent)_50%,var(--primary)_60%,transparent_80%)] bg-[length:200%_100%] animate-spectral-scan" />
          
          {/* Micro-Geometric Lattice (Subtle Grid) */}
          <div className="absolute inset-0 opacity-[0.05] bg-[matrix(1,0,0,1,0,0)]" style={{ backgroundImage: 'radial-gradient(var(--primary) 0.5px, transparent 0.5px)', backgroundSize: '12px 12px' }} />
          
          {/* Inner Glow Border */}
          <div className="absolute inset-0 rounded-2xl border border-primary/20 shadow-[inset_0_0_20px_oklch(from_var(--primary)_l_c_h_/_0.15)]" />
        </div>
      )}

      {/* Main Content (Always rendered but blurred/shifted when loading) */}
      <div className={cn("flex flex-col h-full w-full", showSkeleton && "animate-chromatic-shift opacity-50 grayscale-[0.3] transition-all duration-700 pointer-events-none")}>
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
                <Tooltip>
                  <TooltipTrigger
                    onDoubleClick={() => !isStreaming && setIsEditing(true)}
                    className="flex items-center gap-1.5 text-foreground font-semibold text-[15px] font-sans cursor-text group/title"
                  >
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">{title}</span>
                    {!isStreaming && (
                      <div
                        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        onPointerDown={e => e.stopPropagation()}
                        className="bg-transparent border-none cursor-pointer text-muted-foreground p-0.5 flex items-center hover:text-foreground transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </div>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="top">Double click to rename</TooltipContent>
                </Tooltip>
              )}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-muted-foreground text-[11px] font-sans">Generated &middot; {getRelativeTime(node.createdAt)}</span>
              </div>
            </div>
            <div className="relative flex-shrink-0 h-6 min-w-[60px] flex items-center justify-end">
              <div className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-[11px] font-medium font-sans whitespace-nowrap transition-all duration-300 group-hover:opacity-0 group-hover:scale-90 pointer-events-none">
                {colorCount} colors
              </div>
              <Tooltip>
                <TooltipTrigger
                  onClick={(e) => { e.stopPropagation(); onEjectNode?.(node); }}
                  onPointerDown={e => e.stopPropagation()}
                  className="absolute inset-0 flex items-center justify-center bg-primary text-primary-foreground rounded-full opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 hover:bg-primary/90 shadow-lg cursor-pointer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                  <span className="ml-1 text-[10px] font-bold tracking-tight">SHARE</span>
                </TooltipTrigger>
                <TooltipContent side="top">Share to Chat</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            {node.palette.colors.map((c, i) => (
              <Tooltip key={i}>
                <TooltipTrigger
                  onClick={() => handleCopyHex(c.hex)}
                  onPointerDown={e => e.stopPropagation()}
                  className="flex-1 aspect-square rounded-lg shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] cursor-copy flex items-center justify-center transition-transform hover:scale-105"
                  style={{ backgroundColor: c.hex }}
                >
                  {copiedHex === c.hex && <svg className="drop-shadow-md animate-in zoom-in-50 duration-200" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                </TooltipTrigger>
                <TooltipContent side="bottom">Copy {c.hex}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="flex gap-2 mt-2">
            {node.palette.colors.map((c, i) => (
              <Tooltip key={i}>
                <TooltipTrigger
                  onClick={() => handleCopyHex(c.hex)}
                  onPointerDown={e => e.stopPropagation()}
                  className="flex-1 flex flex-col items-center min-w-0 bg-muted/50 rounded py-1 cursor-copy border border-border/50 hover:bg-muted transition-colors"
                >
                  <span className="text-muted-foreground text-[10px] font-mono">{c.hex}</span>
                </TooltipTrigger>
                <TooltipContent side="bottom">Copy {c.hex}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          {(node.palette.description) && (
            <>
              <div className="h-px bg-border/30 my-4" />
              <div className="px-1 space-y-1.5">
                <div className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/50 font-bold">Concept</div>
                <p className="text-foreground/90 text-[12px] leading-relaxed font-medium italic">
                  {node.palette.description.replace(/^#/, '')}
                </p>
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
            <div className="flex justify-end items-center mt-4 pt-4 border-t border-border/30 gap-1">
              <Tooltip>
                <TooltipTrigger
                  className="p-1.5 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center"
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setIsRegenerating(true);
                    setIsExpanded(false);
                    onRefineNode?.(node); 
                  }}
                  onPointerDown={e => e.stopPropagation()}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                </TooltipTrigger>
                <TooltipContent side="top">Regenerate Palette</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger className="bg-transparent border-none cursor-pointer text-muted-foreground p-1.5 rounded-md flex items-center justify-center transition-colors hover:bg-muted hover:text-foreground" onClick={(e) => { e.stopPropagation(); setIsExpanded(prev => !prev); }} onPointerDown={e => e.stopPropagation()}>
                  {isExpanded ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l7-7 7 7M5 15l7 7 7-7" /></svg> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>}
                </TooltipTrigger>
                <TooltipContent side="top">{isExpanded ? 'Hide Breakdown' : 'Show Color Breakdown'}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger className="bg-transparent border-none cursor-pointer text-muted-foreground p-1.5 rounded-md flex items-center justify-center transition-colors hover:bg-muted hover:text-foreground" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(JSON.stringify(node.palette, null, 2)); showToast("Copied JSON!"); }} onPointerDown={e => e.stopPropagation()}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg></TooltipTrigger>
                <TooltipContent side="top">Copy as JSON</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger className="bg-transparent border-none cursor-pointer text-muted-foreground p-1.5 rounded-md flex items-center justify-center transition-colors hover:bg-muted hover:text-foreground" onClick={(e) => { e.stopPropagation(); onSaveNode?.(node.id); showToast("Saved to library!"); }} onPointerDown={e => e.stopPropagation()}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2-2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg></TooltipTrigger>
                <TooltipContent side="top">Save to Library</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {!isStreaming && (
          <div onPointerDown={(e) => onResizePointerDown(e, node)} onPointerUp={onPointerUp} className="absolute right-0 bottom-0 w-4 h-4 cursor-ew-resize flex items-center justify-center text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 1L7 7L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
        )}
      </div>
  );
}));

export default function StudioCanvas(props: StudioCanvasProps): React.JSX.Element {
  const { nodes, streamingNode, onNodeMove, onNodeResize, onSaveNode, onRefineNode, onEjectNode, isStreaming, refinementNodeId } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});

  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [nodeWidths, setNodeWidths] = useState<Record<string, number>>({});

  const dragInfo = useRef<DragInfo | null>(null);
  const GRID_SIZE = 32;

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
      if (worldRef.current) worldRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${zoom})`;
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
      const worldDx = dx / zoom;
      const worldDy = dy / zoom;
      info.nodeIds.forEach(id => {
        const el = nodeRefs.current[id];
        const initial = info.initialPositions[id];
        if (el && initial) {
          const snappedX = Math.round((initial.x + worldDx) / GRID_SIZE) * GRID_SIZE;
          const snappedY = Math.round((initial.y + worldDy) / GRID_SIZE) * GRID_SIZE;
          el.style.transform = `translate(${snappedX}px, ${snappedY}px) scale(1.02)`;
          el.style.zIndex = '10';
        }
      });
    } else if (info.type === 'resize') {
      const newWidth = Math.max(280, info.initialWidth + dx / zoom);
      const el = nodeRefs.current[info.nodeId];
      if (el) el.style.width = `${newWidth}px`;
    }
  }, [nodes, zoom]);

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
      const worldDx = (e.clientX - info.startX) / zoom;
      const worldDy = (e.clientY - info.startY) / zoom;
      info.nodeIds.forEach(id => {
        const el = nodeRefs.current[id];
        if (el) {
          const snappedX = Math.round((info.initialPositions[id].x + worldDx) / GRID_SIZE) * GRID_SIZE;
          const snappedY = Math.round((info.initialPositions[id].y + worldDy) / GRID_SIZE) * GRID_SIZE;
          el.style.transform = `translate(${snappedX}px, ${snappedY}px)`;
          el.style.zIndex = '';
          if (snappedX !== info.initialPositions[id].x || snappedY !== info.initialPositions[id].y) {
            onNodeMove(id, { x: snappedX, y: snappedY });
          }
        }
      });
    }
    else if (info.type === 'resize') {
      const newWidth = Math.max(280, info.initialWidth + (e.clientX - info.startX) / zoom);
      setNodeWidths(prev => ({ ...prev, [info.nodeId]: newWidth }));
      if (onNodeResize) onNodeResize(info.nodeId, newWidth);
    }

    dragInfo.current = null;
  }, [onNodeMove, onNodeResize, zoom]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const scale = Math.exp(-e.deltaY * 0.01);
      const newZoom = Math.min(Math.max(0.1, zoom * scale), 5);
      const ratio = newZoom / zoom;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const newPanX = mouseX - (mouseX - panOffset.x) * ratio;
      const newPanY = mouseY - (mouseY - panOffset.y) * ratio;

      setZoom(newZoom);
      setPanOffset({ x: newPanX, y: newPanY });

      if (worldRef.current) {
        worldRef.current.style.transform = `translate(${newPanX}px, ${newPanY}px) scale(${newZoom})`;
      }
      if (containerRef.current) {
        containerRef.current.style.backgroundPosition = `${newPanX}px ${newPanY}px`;
        containerRef.current.style.backgroundSize = `${GRID_SIZE * newZoom}px ${GRID_SIZE * newZoom}px`;
      }
      return;
    }

    // Pan
    setPanOffset(prev => {
      const newX = prev.x - e.deltaX;
      const newY = prev.y - e.deltaY;

      if (worldRef.current) {
        worldRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${zoom})`;
      }
      if (containerRef.current) {
        containerRef.current.style.backgroundPosition = `${newX}px ${newY}px`;
      }

      return { x: newX, y: newY };
    });
  }, [zoom, panOffset]);

  const handleCleanUp = useCallback(() => {
    let currentX = 0;
    let currentY = 0;
    let rowMaxHeight = 0;
    const SPACING = 32;
    const MAX_WIDTH = 1200;

    nodes.forEach(node => {
      const w = nodeWidths[node.id] || node.width || 320;
      const el = nodeRefs.current[node.id];
      const h = el ? el.getBoundingClientRect().height / zoom : 300;

      if (currentX + w > MAX_WIDTH && currentX > 0) {
        currentX = 0;
        currentY += Math.ceil((rowMaxHeight + SPACING) / GRID_SIZE) * GRID_SIZE;
        rowMaxHeight = 0;
      }

      const snappedX = Math.round(currentX / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(currentY / GRID_SIZE) * GRID_SIZE;

      if (snappedX !== node.position.x || snappedY !== node.position.y) {
        onNodeMove(node.id, { x: snappedX, y: snappedY });
      }

      if (el) {
        el.style.transform = `translate(${snappedX}px, ${snappedY}px)`;
      }

      currentX = snappedX + w + SPACING;
      rowMaxHeight = Math.max(rowMaxHeight, h);
    });
  }, [nodes, nodeWidths, onNodeMove, zoom]);

  return (
    <TooltipProvider delay={400}>
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
          backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`,
          backgroundPosition: `${panOffset.x}px ${panOffset.y}px`
        }}
      >
        <div
          ref={worldRef}
          className="absolute top-0 left-0 w-0 h-0 origin-top-left"
          style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})` }}
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
              onEjectNode={onEjectNode}
              refinementNodeId={refinementNodeId}
              globalIsStreaming={isStreaming}
            />
          ))}
          {streamingNode && !refinementNodeId && (
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

        <div className="absolute bottom-6 right-6 z-50">
          <Tooltip>
            <TooltipTrigger render={(props) => (
              <button
                {...props}
                onClick={(e) => {
                  props.onClick?.(e);
                  handleCleanUp();
                }}
                className="bg-background/80 backdrop-blur-md border border-border shadow-sm text-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                Clean Up
              </button>
            )} />
            <TooltipContent side="top">Organize all nodes in a grid</TooltipContent>
          </Tooltip>
        </div>

        <div
          ref={marqueeRef}
          className="absolute hidden border border-primary bg-primary/10 pointer-events-none z-[9999]"
        />
      </div>
    </TooltipProvider>
  );
}
