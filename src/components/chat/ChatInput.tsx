import React, { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Paperclip, Send, Square, Mic, MicOff, Headphones, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { VoiceIndicator } from './VoiceIndicator';
import { ModelMarketplace } from './ModelMarketplace';
import { CheckIcon } from 'lucide-react';
import { WebSearchControl } from '@/src/components/chat/WebSearchControl';
import { ArtifactControl } from '@/src/components/chat/ArtifactControl';
import { getTauriInvoke } from '@/src/lib/tauri-utils';
import { resolveMediaSrc } from '@/src/lib/mediaPaths';
import { FilePreviewModal, type PreviewFile } from '@/src/components/chat/FilePreviewModal';
import { useFileDrop } from '@/src/hooks/useFileDrop';
import { useMicController } from '@/src/hooks/useMicController';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ChatInputProps {
  input: string;
  setInput: (val: string | ((prev: string) => string)) => void;
  handleSend: (bypassCheck?: boolean) => void;
  onStop?: () => void;
  isThinking: boolean;
  attachedFile: { name: string; path: string } | null;
  setAttachedFile: (file: { name: string; path: string } | null) => void;
  isWebSearchActive: boolean;
  setIsWebSearchActive: (val: boolean) => void;
  isArtifactToolActive: boolean;
  setIsArtifactToolActive: (val: boolean) => void;
  enterToSend: boolean;
  isIncognito?: boolean;
  isDark?: boolean;
  hasCustomBg?: boolean;
  isPinkMode?: boolean;
  isModelLoaded?: boolean;
  onFocus?: () => void;
  isListening?: boolean;
  setIsListening?: (val: boolean) => void;
}

// ─── File attachment card (must be above ChatInput for reliable init / HMR) ───

const IMAGE_EXTS = /\.(png|jpe?g|gif|webp)$/i;

const TEXT_EXTS = new Set([
  'txt', 'md', 'csv', 'rtf', 'html', 'json',
  'py', 'js', 'ts', 'jsx', 'tsx', 'rs', 'go', 'java', 'cpp', 'c', 'cs', 'rb', 'php',
  'yaml', 'toml', 'xml',
]);


function getFileTypeLabel(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'PDF';
  if (['docx', 'doc'].includes(ext)) return 'DOCX';
  if (['xlsx', 'xls'].includes(ext)) return 'XLSX';
  if (['pptx', 'ppt'].includes(ext)) return 'PPTX';
  if (ext === 'csv') return 'CSV';
  if (ext === 'md') return 'MD';
  if (['txt', 'rtf'].includes(ext)) return 'TXT';
  if (ext === 'json') return 'JSON';
  if (['yaml', 'toml', 'xml', 'html'].includes(ext)) return ext.toUpperCase();
  if (['py', 'rb', 'go', 'rs', 'java', 'cpp', 'c', 'cs', 'php'].includes(ext)) return ext.toUpperCase();
  if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) return ext.toUpperCase();
  return ext.toUpperCase() || 'FILE';
}

const FILE_BADGE_NEUTRAL =
  'text-[10px] font-semibold px-1.5 py-0.5 rounded-md border border-muted-foreground/25 bg-muted/80 text-foreground';

const DISMISS_BTN = "absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border border-muted-foreground/30 shadow flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-muted-foreground/60 transition-all opacity-0 group-hover:opacity-100";

function AttachmentCard({ file, onRemove, onPreview }: {
  file: { name: string; path: string };
  onRemove: () => void;
  onPreview: () => void;
}) {
  const isImage = IMAGE_EXTS.test(file.name);
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const [lineCount, setLineCount] = useState<number | null>(null);

  useEffect(() => {
    if (isImage || !TEXT_EXTS.has(ext)) return;
    let cancelled = false;
    fetch(resolveMediaSrc(file.path))
      .then(r => r.text())
      .then(text => { if (!cancelled) setLineCount(text.split('\n').length); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [file.path, isImage, ext]);

  if (isImage) {
    return (
      <div
        className="relative inline-block shrink-0 group cursor-pointer"
        onClick={onPreview}
      >
        <img
          src={resolveMediaSrc(file.path)}
          alt={file.name}
          className="h-28 w-28 object-cover rounded-xl border border-muted-foreground/20 shadow-sm"
        />
        <button
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className={DISMISS_BTN}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  const label = getFileTypeLabel(file.name);

  return (
    <div
      className="relative flex h-28 w-28 shrink-0 flex-col rounded-xl border border-muted-foreground/20 bg-muted/50 p-2.5 shadow-sm group cursor-pointer"
      onClick={onPreview}
    >
      <div className="min-h-0 flex-1 overflow-hidden flex flex-col gap-1">
        <p className="text-[11px] font-semibold leading-snug text-foreground line-clamp-2 break-words">
          {file.name}
        </p>
        <p className="shrink-0 text-[10px] leading-tight text-muted-foreground">
          {lineCount !== null ? `${lineCount} lines` : '\u00a0'}
        </p>
      </div>
      <div className="mt-2 shrink-0 border-t border-muted-foreground/15 pt-2">
        <span className={FILE_BADGE_NEUTRAL}>{label}</span>
      </div>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className={DISMISS_BTN}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function getComposerShellClassName({
  isWebSearchActive,
  isArtifactToolActive,
  isIncognito,
  isDark,
  isPinkMode,
  hasCustomBg,
}: {
  isWebSearchActive: boolean;
  isArtifactToolActive: boolean;
  isIncognito?: boolean;
  isDark?: boolean;
  isPinkMode?: boolean;
  hasCustomBg?: boolean;
}): string {
  if (isWebSearchActive) {
    return 'border-blue-500/50 bg-background shadow-[0_0_15px_-3px_rgba(59,130,246,0.1)]';
  }

  if (isArtifactToolActive) {
    return 'border-violet-500/45 bg-background shadow-[0_0_15px_-3px_rgba(139,92,246,0.12)]';
  }

  if (isIncognito) {
    return isDark
      ? 'bg-neutral-900/90 backdrop-blur-xl border-neutral-800 focus-within:border-neutral-700 shadow-2xl'
      : 'bg-white/80 backdrop-blur-xl border-neutral-200/50 shadow-lg focus-within:border-neutral-300/50';
  }

  if (isPinkMode) {
    return 'bg-white/80 backdrop-blur-xl border-rose-200 focus-within:ring-1 focus-within:ring-rose-300 focus-within:border-rose-300 shadow-sm';
  }

  if (hasCustomBg) {
    return 'bg-background/20 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50';
  }

  return 'bg-background border-muted-foreground/20 shadow-sm focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/50';
}

export const ChatInput = ({
  input,
  setInput,
  handleSend,
  onStop,
  isThinking,
  attachedFile,
  setAttachedFile,
  isWebSearchActive,
  setIsWebSearchActive,
  isArtifactToolActive,
  setIsArtifactToolActive,
  enterToSend,
  isIncognito,
  isDark,
  hasCustomBg,
  isPinkMode,
  isModelLoaded = true,
  onFocus,
  isListening,
  setIsListening,
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rafRef = useRef<number | null>(null);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  
  const {
    isDragOver,
    dragFileName,
    dragPointer,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleAttachClick,
    fileInputRef,
  } = useFileDrop(setAttachedFile);

  const {
    audioDevices,
    selectedDevice,
    setSelectedDevice,
    meterLevel,
    isMicMenuOpen,
    setIsMicMenuOpen,
    isMicHovering,
    setIsMicHovering,
    holdToRecord,
    setHoldToRecord,
    micMenuPos,
    micMenuRef,
    micPillRef,
    handleMicClick,
    startVoiceCapture,
    stopVoiceCapture,
    handleMicSettingsToggle,
    installedModels,
    downloadingModels,
    isMarketplaceOpen,
    setIsMarketplaceOpen,
    downloadModel,
    isMicEnabled,
    isTranscribing,
  } = useMicController(setInput, isListening, setIsListening);

  useEffect(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = '56px';
      el.style.height = `${el.scrollHeight}px`;
    });
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [input, isTranscribing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && enterToSend) {
      e.preventDefault();
      handleSend();
    }
  };

  const composerShellClassName = getComposerShellClassName({
    isWebSearchActive,
    isArtifactToolActive,
    isIncognito,
    isDark,
    isPinkMode,
    hasCustomBg,
  });

  return (
    <>
    {isDragOver && (
      <div
        className="pointer-events-none fixed z-[10010]"
        style={{ left: dragPointer.x + 20, top: dragPointer.y + 24 }}
      >
        <span className="inline-flex max-w-[220px] truncate rounded-md border border-blue-500/35 bg-background/85 px-2 py-1 text-[11px] font-medium text-blue-500/95 shadow-md backdrop-blur-sm">
          {dragFileName || 'Drop file'}
        </span>
      </div>
    )}
    <div
      className="flex-shrink-0 w-full z-20 transition-all bg-transparent"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="chat-content-frame relative pb-4 md:pb-6">
        {/* Waveform pill ONLY during active recording */}
        <VoiceIndicator isActive={(isListening && !isTranscribing) || false} isPinkMode={isPinkMode} />
        
        <ModelMarketplace 
          isOpen={isMarketplaceOpen}
          onClose={() => setIsMarketplaceOpen(false)}
          installedModels={installedModels}
          downloadingModels={downloadingModels}
          onDownload={downloadModel}
        />

        {/* Browser-only hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.md,.csv,.rtf,.html,.json,.py,.js,.ts,.jsx,.tsx,.rs,.go,.java,.cpp,.c,.cs,.rb,.php,.yaml,.toml,.xml,.docx,.xlsx,.pptx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setAttachedFile({ name: file.name, path: URL.createObjectURL(file) });
              e.target.value = '';
            }
          }}
        />

        <div
          className={cn(
            'relative flex items-end w-full rounded-2xl transition-all duration-300 overflow-hidden border-[1.5px]',
            composerShellClassName,
          )}
        >
          <div className="flex flex-col w-full min-h-[56px] relative">
            {isDragOver && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-500 bg-blue-500/5 pointer-events-none select-none">
                <Paperclip className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-blue-500">Drop files here</span>
              </div>
            )}
            {attachedFile && (
              <div className="px-4 pt-3 pb-1">
                <AttachmentCard
                  file={attachedFile}
                  onRemove={() => setAttachedFile(null)}
                  onPreview={() => setPreviewFile(attachedFile)}
                />
              </div>
            )}
            
            {isTranscribing ? (
              /* SKELETON INSIDE THE MESSAGE BUBBLE/INPUT BOX */
              <div
                className="w-full flex flex-col gap-2.5 px-4 py-5 pointer-events-none min-h-[56px]"
                style={{
                  '--sk-base': isPinkMode ? '#fda4af' : (isDark ? '#3a3a3a' : '#dedede'),
                  '--sk-hi': isPinkMode ? '#fecdd3' : (isDark ? '#555555' : '#f5f5f5'),
                } as React.CSSProperties}
              >
                <div className="h-2 w-3/4 rounded-full skeleton-shimmer" />
                <div className="h-2 w-1/2 rounded-full skeleton-shimmer" />
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={onFocus}
                placeholder="Message..."
                className="w-full max-h-[40vh] min-h-[56px] resize-none bg-transparent px-4 py-4 text-sm focus:outline-none placeholder:text-muted-foreground/70"
                rows={1}
              />
            )}

            <ChatInputControls
              hasText={!!input.trim()}
              isThinking={isThinking}
              onSend={handleSend}
              onStop={onStop}
              attachedFile={attachedFile}
              onAttachClick={handleAttachClick}
              isWebSearchActive={isWebSearchActive}
              setIsWebSearchActive={setIsWebSearchActive}
              isArtifactToolActive={isArtifactToolActive}
              setIsArtifactToolActive={setIsArtifactToolActive}
              isPinkMode={isPinkMode}
              isDark={isDark}
              isModelLoaded={isModelLoaded}
              isMicEnabled={isMicEnabled}
              isListening={isListening}
              holdToRecord={holdToRecord}
              setHoldToRecord={setHoldToRecord}
              audioDevices={audioDevices}
              selectedDevice={selectedDevice}
              setSelectedDevice={setSelectedDevice}
              meterLevel={meterLevel}
              isMicMenuOpen={isMicMenuOpen}
              setIsMicMenuOpen={setIsMicMenuOpen}
              isMicHovering={isMicHovering}
              setIsMicHovering={setIsMicHovering}
              micMenuPos={micMenuPos}
              micMenuRef={micMenuRef}
              micPillRef={micPillRef}
              onMicClick={handleMicClick}
              onMicMouseDown={startVoiceCapture}
              onMicMouseUp={stopVoiceCapture}
              onMicMouseLeave={stopVoiceCapture}
              onMicSettingsToggle={handleMicSettingsToggle}
            />
          </div>
        </div>
        <div className="text-center mt-1">
          <span className={`text-[10px] transition-colors duration-300 ${isPinkMode ? 'text-rose-500 font-medium' : (hasCustomBg ? 'text-muted-foreground opacity-100 font-medium' : 'text-muted-foreground/70')}`}>
            AI can make mistakes. Please verify important information.
          </span>
        </div>
      </div>
    </div>
    <FilePreviewModal
      file={previewFile}
      onClose={() => setPreviewFile(null)}
      isDark={isDark ?? false}
    />
    </>
  );
};

// ─── Memoized toolbar ────────────────────────────────────────────────────────
// Receives hasText (boolean) instead of the full input string so it only
// re-renders when the input transitions between empty and non-empty — never
// on every individual keystroke.
interface ChatInputControlsProps {
  hasText: boolean;
  isThinking: boolean;
  onSend: (bypassCheck?: boolean) => void;
  onStop?: () => void;
  attachedFile: { name: string; path: string } | null;
  onAttachClick: () => void;
  isWebSearchActive: boolean;
  setIsWebSearchActive: (val: boolean) => void;
  isArtifactToolActive: boolean;
  setIsArtifactToolActive: (val: boolean) => void;
  isPinkMode?: boolean;
  isDark?: boolean;
  isModelLoaded?: boolean;
  isMicEnabled: boolean;
  isListening?: boolean;
  holdToRecord: boolean;
  setHoldToRecord: (val: boolean) => void;
  audioDevices: string[];
  selectedDevice: string;
  setSelectedDevice: (val: string) => void;
  meterLevel: number;
  isMicMenuOpen: boolean;
  setIsMicMenuOpen: (val: boolean) => void;
  isMicHovering: boolean;
  setIsMicHovering: (val: boolean) => void;
  micMenuPos: { bottom: number; right: number } | null;
  micMenuRef: React.RefObject<HTMLDivElement>;
  micPillRef: React.RefObject<HTMLDivElement>;
  onMicClick: () => void;
  onMicMouseDown: () => void;
  onMicMouseUp: () => void;
  onMicMouseLeave: () => void;
  onMicSettingsToggle: () => void;
}

const ChatInputControls = React.memo(({
  hasText,
  isThinking,
  onSend,
  onStop,
  attachedFile,
  onAttachClick,
  isWebSearchActive,
  setIsWebSearchActive,
  isArtifactToolActive,
  setIsArtifactToolActive,
  isPinkMode,
  isDark,
  isMicEnabled,
  isListening,
  holdToRecord,
  setHoldToRecord,
  audioDevices,
  selectedDevice,
  setSelectedDevice,
  meterLevel,
  isMicMenuOpen,
  setIsMicMenuOpen,
  isMicHovering,
  setIsMicHovering,
  micMenuPos,
  micMenuRef,
  micPillRef,
  onMicClick,
  onMicMouseDown,
  onMicMouseUp,
  onMicMouseLeave,
  onMicSettingsToggle,
}: ChatInputControlsProps) => {
  return (
    <div className="flex items-center justify-between px-3 pb-3 pt-1">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-lg transition-colors ${attachedFile ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
          onClick={onAttachClick}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <WebSearchControl
          isWebSearchActive={isWebSearchActive}
          setIsWebSearchActive={setIsWebSearchActive}
          isPinkMode={isPinkMode}
          isDark={isDark}
        />
        <ArtifactControl
          isArtifactToolActive={isArtifactToolActive}
          setIsArtifactToolActive={setIsArtifactToolActive}
        />
      </div>
      <div className="flex items-center gap-2">
        {!hasText && (
          <div
            className="inline-flex relative items-center gap-1"
            onMouseEnter={() => setIsMicHovering(true)}
            onMouseLeave={() => setIsMicHovering(false)}
          >
            {/* Custom mic settings popover — rendered in a portal to escape overflow:hidden ancestors */}
            {isMicMenuOpen && micMenuPos && createPortal(
              <div
                ref={micMenuRef}
                style={{ position: 'fixed', bottom: micMenuPos.bottom, right: micMenuPos.right }}
                className="w-80 z-[9999] rounded-xl bg-background/85 backdrop-blur-xl border border-white/10 p-2 shadow-2xl"
              >
                <div className="px-2 pt-3 pb-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Mic className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-75"
                        style={{ width: `${Math.round(meterLevel * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="px-1">
                  <div className="text-[11px] text-muted-foreground px-2 py-2">
                    Microphone input
                  </div>
                  {audioDevices.length > 0 ? (
                    audioDevices.map((device) => {
                      const isSelected = device === selectedDevice;
                      const isDefaultAlias = device.startsWith("Default - ");
                      return (
                        <button
                          key={device}
                          type="button"
                          className={cn(
                            "relative flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm cursor-pointer h-9 outline-none",
                            "hover:bg-accent hover:text-accent-foreground",
                            isSelected && "text-foreground"
                          )}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={async () => {
                            try {
                              const invoke = await getTauriInvoke();
                              if (!invoke) {
                                toast.error('Audio device selection is only available in desktop mode');
                                return;
                              }
                              await invoke('set_audio_device', { name: device });
                              setSelectedDevice(device);
                              toast.success(`Microphone set to ${device}`);
                            } catch (e: any) {
                              toast.error(`Mic switch failed. ${e}`);
                            }
                          }}
                        >
                          <Headphones className="h-3.5 w-3.5 shrink-0" />
                          <span className={cn("truncate flex-1 text-left", isDefaultAlias && "font-semibold")}>
                            {device}
                          </span>
                          {isSelected && <CheckIcon className="h-3.5 w-3.5 shrink-0 ml-auto" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-[11px] text-muted-foreground px-2 py-2 italic text-center">
                      No devices found
                    </div>
                  )}
                </div>
                <div className="mt-2 border-t border-border/50 pt-3 px-3 flex items-center justify-between gap-3 min-w-0">
                  <span className="text-sm text-muted-foreground truncate">Hold to record</span>
                  <Switch className="shrink-0" checked={holdToRecord} onCheckedChange={setHoldToRecord} />
                </div>
              </div>,
              document.body
            )}

            <div ref={micPillRef} className="inline-flex relative items-center rounded-xl bg-muted/40 px-1 border border-border/50">
              {(isMicHovering || isMicMenuOpen) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-6 rounded-md text-muted-foreground transition-all"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onMicSettingsToggle();
                  }}
                  aria-label="Microphone settings"
                >
                  <ChevronDown
                    className="h-3.5 w-3.5 transition-transform duration-200"
                    style={{ transform: isMicMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </Button>
              )}
              <Tooltip>
                <TooltipTrigger render={(props) => (
                  <Button
                    {...props}
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-lg transition-all relative overflow-hidden",
                      !isMicEnabled
                        ? "text-destructive hover:bg-destructive/10"
                        : (isListening ? "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")
                    )}
                    onClick={onMicClick}
                    onMouseDown={(e) => {
                      if (!holdToRecord) return;
                      e.preventDefault();
                      onMicMouseDown();
                    }}
                    onMouseUp={() => {
                      if (!holdToRecord) return;
                      onMicMouseUp();
                    }}
                    onMouseLeave={() => {
                      if (!holdToRecord) return;
                      onMicMouseLeave();
                    }}
                  >
                    {isMicEnabled ? (
                      <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
                    ) : (
                      <MicOff className="h-4 w-4" />
                    )}
                  </Button>
                )} />
                <TooltipContent side="top" className="text-[11px] leading-relaxed whitespace-pre-line py-2 px-3">
                  {"Press and hold to record\nCtrl+D for voice input"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
        {(isThinking || hasText) && (
          <Button
            size="icon"
            className={`h-8 w-8 rounded-lg transition-all ${isThinking
                ? 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90'
                : 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
              }`}
            onClick={isThinking ? onStop : () => onSend()}
          >
            {isThinking ? <Square className="h-4 w-4 fill-current" /> : <Send className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
});
