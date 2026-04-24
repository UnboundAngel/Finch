import { StateCreator } from 'zustand';
import { ParsedPalette } from '@/src/lib/jsonParser';

export interface PaletteNode {
  id: string;
  position: { x: number; y: number };
  width?: number;
  palette: ParsedPalette;
  createdAt: number;
}

export interface StudioState {
  nodes: PaletteNode[];
  studioStreamBuffer: string;
  addNode: (palette: ParsedPalette) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  setStreamBuffer: (buffer: string | ((prev: string) => string)) => void;
  clearBuffer: () => void;
}

export const createStudioSlice: StateCreator<StudioState, [], [], StudioState> = (set) => ({
  nodes: [],
  studioStreamBuffer: '',
  addNode: (palette) => set((state) => ({
    nodes: [...state.nodes, {
      id: crypto.randomUUID(),
      position: { x: 100 + state.nodes.length * 320, y: 100 },
      palette,
      createdAt: Date.now()
    }]
  })),
  updateNodePosition: (id, position) => set((state) => ({
    nodes: state.nodes.map(n => n.id === id ? { ...n, position } : n)
  })),
  setStreamBuffer: (buffer) => set((state) => ({
    studioStreamBuffer: typeof buffer === 'function' ? buffer(state.studioStreamBuffer) : buffer
  })),
  clearBuffer: () => set({ studioStreamBuffer: '' })
});
