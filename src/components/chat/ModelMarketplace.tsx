import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Check, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WhisperModel {
  id: string;
  name: string;
  description: string;
  size: string;
  url: string;
  sha256: string;
}

export const WHISPER_MODELS: WhisperModel[] = [
  {
    id: 'ggml-tiny',
    name: 'Tiny',
    description: 'Ultra-fast, lowest accuracy. Good for simple commands.',
    size: '~75 MB',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
    sha256: 'stub_tiny_sha256',
  },
  {
    id: 'ggml-base',
    name: 'Base',
    description: 'Fast and reliable. Recommended for most users.',
    size: '~145 MB',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin',
    sha256: 'stub_base_sha256',
  },
  {
    id: 'ggml-small',
    name: 'Small',
    description: 'High accuracy, slower inference. Best for complex speech.',
    size: '~480 MB',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    sha256: 'stub_small_sha256',
  },
];

interface ModelMarketplaceProps {
  isOpen: boolean;
  onClose: () => void;
  installedModels: string[];
  downloadingModels: Record<string, number>;
  onDownload: (model: WhisperModel) => void;
}

export const ModelMarketplace = ({
  isOpen,
  onClose,
  installedModels,
  downloadingModels,
  onDownload,
}: ModelMarketplaceProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for closing */}
          <div 
            className="fixed inset-0 z-[110]" 
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-[120]",
              "w-[320px] rounded-2xl overflow-hidden shadow-2xl border",
              "bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-white/20 dark:border-white/10"
            )}
          >
            <div className="p-4 border-b border-white/10 dark:border-white/5 bg-primary/5">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                Voice Model Marketplace
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Download a model to enable high-performance local transcription.
              </p>
            </div>

            <div className="p-2 space-y-1">
              {WHISPER_MODELS.map((model) => {
                const isInstalled = installedModels.includes(model.id);
                const progress = downloadingModels[model.id];
                const isDownloading = progress !== undefined;

                return (
                  <div 
                    key={model.id}
                    className="group relative p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 dark:hover:border-white/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{model.name}</span>
                          <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            {model.size}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {model.description}
                        </p>
                      </div>

                      <div className="flex-shrink-0 self-center">
                        {isInstalled ? (
                          <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Check className="h-4 w-4" />
                          </div>
                        ) : isDownloading ? (
                          <div className="h-8 w-8 flex items-center justify-center">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          </div>
                        ) : (
                          <button
                            onClick={() => onDownload(model)}
                            className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-all active:scale-95"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isDownloading && (
                      <div className="mt-3 h-1 w-full bg-muted/30 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-muted/20 border-t border-white/5 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
              <p className="text-[10px] text-muted-foreground leading-normal italic">
                Models are stored locally in your app data folder and never leave your device.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
