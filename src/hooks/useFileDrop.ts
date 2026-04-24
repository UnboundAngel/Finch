import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { open as openFilePicker } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { isTauri } from '@/src/lib/tauri-utils';

const SUPPORTED_DROP_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp',
  'pdf',
  'txt', 'md', 'csv', 'rtf', 'html', 'json',
  'py', 'js', 'ts', 'jsx', 'tsx', 'rs', 'go', 'java', 'cpp', 'c', 'cs', 'rb', 'php',
  'yaml', 'yml', 'toml', 'xml', 'sql', 'css', 'sh', 'bash',
  'docx', 'xlsx', 'pptx',
]);

export function useFileDrop(setAttachedFile: (file: { name: string; path: string } | null) => void) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragFileName, setDragFileName] = useState<string>('');
  const [dragPointer, setDragPointer] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleAttachClick = useCallback(async () => {
    if (isTauri()) {
      try {
        const result = await openFilePicker({
          multiple: true,
          filters: [{
            name: 'Files',
            extensions: [
              'png', 'jpg', 'jpeg', 'gif', 'webp',
              'pdf',
              'txt', 'md', 'csv', 'rtf', 'html', 'json',
              'py', 'js', 'ts', 'jsx', 'tsx', 'rs', 'go', 'java', 'cpp', 'c', 'cs', 'rb', 'php', 'yaml', 'toml', 'xml',
              'docx', 'xlsx', 'pptx',
            ],
          }],
        });
        const paths = Array.isArray(result) ? result : (result ? [result] : []);
        if (paths.length > 0) {
          const firstPath = paths[0] as string;
          const parts = firstPath.replace(/\\/g, '/').split('/');
          const name = parts[parts.length - 1];
          
          try {
            const size = await invoke<number>('get_file_size', { path: firstPath });
            if (size > 500 * 1024 * 1024) {
              toast.error('File exceeds the 500 MB limit', { duration: 3000, position: 'bottom-center' });
              return;
            }
          } catch {}

          setAttachedFile({ name, path: firstPath });
        }
      } catch {
        // Dialog system error — silently ignore
      }
    } else {
      fileInputRef.current?.click();
    }
  }, [setAttachedFile]);

  // ── Tauri v2: native OS file drag-drop ──────────────────────────────────────
  // Tauri intercepts native file drags at the webview level — HTML drag events
  // never fire for files dragged from the OS. We use the Tauri webview API and
  // fall back to HTML drag handlers in browser mode.
  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      const { getCurrentWebview } = await import('@tauri-apps/api/webview');
      unlisten = await getCurrentWebview().onDragDropEvent((event) => {
        const payload = event.payload as any;
        const { type } = payload;
        const paths: string[] = payload.paths ?? [];
        const firstPath = paths[0] as string | undefined;
        const inferredName = firstPath?.replace(/\\/g, '/').split('/').pop() ?? '';
        const pos = payload.position ?? payload.pos ?? payload.cursor ?? {};
        const x = typeof pos.x === 'number' ? pos.x : (typeof payload.x === 'number' ? payload.x : null);
        const y = typeof pos.y === 'number' ? pos.y : (typeof payload.y === 'number' ? payload.y : null);
        if (x !== null && y !== null) setDragPointer({ x, y });

        if (type === 'enter') {
          setIsDragOver(true);
          setDragFileName(inferredName);
        } else if (type === 'over') {
          setIsDragOver(true);
          if (inferredName) setDragFileName(inferredName);
        } else if (type === 'leave') {
          setIsDragOver(false);
          setDragFileName('');
        } else if (type === 'drop') {
          setIsDragOver(false);
          setDragFileName('');
          if (paths.length === 0) return;
          const filePath = paths[0];
          const name = filePath.replace(/\\/g, '/').split('/').pop() ?? 'file';
          const ext = name.split('.').pop()?.toLowerCase() ?? '';
          if (!SUPPORTED_DROP_EXTS.has(ext)) {
            toast.error(`".${ext}" files are not supported`, { duration: 2500, position: 'bottom-center' });
            return;
          }
          
          invoke<number>('get_file_size', { path: filePath })
            .then(size => {
              if (size > 500 * 1024 * 1024) {
                toast.error('File exceeds the 500 MB limit', { duration: 3000, position: 'bottom-center' });
                return;
              }
              setAttachedFile({ name, path: filePath });
            })
            .catch(() => {
              setAttachedFile({ name, path: filePath });
            });
        }
      });
    };

    setup().catch(console.error);
    return () => { unlisten?.(); };
  }, [setAttachedFile]);

  // ── Browser fallback: HTML drag events (no-ops in Tauri) ─────────────────
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (isTauri()) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragOver(true);
    setDragPointer({ x: e.clientX, y: e.clientY });
    const first = e.dataTransfer.files?.[0];
    if (first?.name) setDragFileName(first.name);
  }, []);

  const handleDragLeave = useCallback(() => {
    if (isTauri()) return;
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
      setDragFileName('');
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (isTauri()) return;
    e.preventDefault();
    setDragPointer({ x: e.clientX, y: e.clientY });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (isTauri()) return;
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    setDragFileName('');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    if (file.size > 500 * 1024 * 1024) {
      toast.error('File exceeds the 500 MB limit', { duration: 3000, position: 'bottom-center' });
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!SUPPORTED_DROP_EXTS.has(ext)) {
      toast.error(`".${ext}" files are not supported`, { duration: 2500, position: 'bottom-center' });
      return;
    }
    const path = URL.createObjectURL(file);
    setAttachedFile({ name: file.name, path });
  }, [setAttachedFile]);

  return {
    isDragOver,
    dragFileName,
    dragPointer,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleAttachClick,
    fileInputRef,
  };
}
