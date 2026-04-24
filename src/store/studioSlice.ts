import { StateCreator } from 'zustand';
import { ParsedPalette } from '@/src/lib/jsonParser';

export interface PaletteNode {
  id: string;
  position: { x: number; y: number };
  width?: number;
  palette: ParsedPalette;
  createdAt: number;
  sourcePrompt: string;
}

export interface StudioState {
  nodes: PaletteNode[];
  studioStreamBuffer: string;
  refinementNodeId: string | null;
  panOffset: { x: number; y: number };
  zoom: number;
  addNode: (palette: ParsedPalette, sourcePrompt: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateNodePalette: (id: string, palette: ParsedPalette, sourcePrompt: string) => void;
  setStreamBuffer: (buffer: string | ((prev: string) => string)) => void;
  clearBuffer: () => void;
  setRefinementNodeId: (id: string | null) => void;
  setPanOffset: (offset: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  deleteNode: (id: string) => void;
  deleteNodes: (ids: string[]) => void;
}

export const createStudioSlice: StateCreator<StudioState, [], [], StudioState> = (set) => ({
  nodes: [],
  studioStreamBuffer: '',
  refinementNodeId: null,
  panOffset: { x: 0, y: 0 },
  zoom: 1,
  addNode: (palette, sourcePrompt) => set((state) => ({
    nodes: [...state.nodes, {
      id: crypto.randomUUID(),
      position: { x: 100 + state.nodes.length * 320, y: 300 },
      palette,
      createdAt: Date.now(),
      sourcePrompt
    }]
  })),
  updateNodePosition: (id, position) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, position } : n)
  })),
  updateNodePalette: (id, palette, sourcePrompt) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, palette, sourcePrompt } : n)
  })),
  setStreamBuffer: (buffer) => set((state) => ({
    studioStreamBuffer: typeof buffer === 'function' ? buffer(state.studioStreamBuffer) : buffer
  })),
  clearBuffer: () => set({ studioStreamBuffer: '' }),
  setRefinementNodeId: (id) => set({ refinementNodeId: id }),
  setPanOffset: (offset) => set((state) => ({ 
    panOffset: typeof offset === 'function' ? offset(state.panOffset) : offset 
  })),
  setZoom: (zoom) => set((state) => ({ 
    zoom: typeof zoom === 'function' ? zoom(state.zoom) : zoom 
  })),
  deleteNode: (id) => set((state) => ({
    nodes: state.nodes.filter(n => n.id !== id)
  })),
  deleteNodes: (ids) => set((state) => ({
    nodes: state.nodes.filter(n => !ids.includes(n.id))
  }))
});
