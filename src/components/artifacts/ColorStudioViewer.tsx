import React, { useState, useMemo } from 'react';
import { Copy, Check, Info, FileCode, Palette, TriangleAlert, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { getContrastText, checkWCAGContrast, normalizeToHex } from '@/src/lib/colorUtils';
import { toast } from 'sonner';

interface ColorStudioPayload {
  colors: string[];
  gradients?: string[];
}

interface ColorStudioViewerProps {
  content: string;
}

export const ColorStudioViewer = ({ content }: ColorStudioViewerProps) => {
  const [showTextPreview, setShowTextPreview] = useState(false);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const payload = useMemo(() => {
    try {
      return JSON.parse(content) as ColorStudioPayload;
    } catch (e) {
      console.error('Failed to parse Color Studio payload:', e);
      return null;
    }
  }, [content]);

  if (!payload || !Array.isArray(payload.colors)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center space-y-4">
        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 flex items-center justify-center">
          <TriangleAlert className="h-8 w-8 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Invalid Palette Data</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            The AI outputted a malformed color studio artifact. You can see the raw output in the "Code" tab.
          </p>
        </div>
      </div>
    );
  }

  const handleCopy = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    toast.success(`Copied ${color}`);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const generateCSSVariables = () => {
    const vars = payload.colors.map((c, i) => `  --color-primary-${i + 1}: ${c};`).join('\n');
    const css = `:root {\n${vars}\n}`;
    navigator.clipboard.writeText(css);
    toast.success('CSS Variables copied to clipboard');
  };

  const generateTailwindConfig = () => {
    const colors = payload.colors.reduce((acc, c, i) => {
      acc[`primary-${i + 1}`] = c;
      return acc;
    }, {} as Record<string, string>);
    const json = JSON.stringify({ theme: { extend: { colors } } }, null, 2);
    navigator.clipboard.writeText(json);
    toast.success('Tailwind config snippet copied');
  };

  return (
    <div className="flex flex-col h-full bg-inherit">
      {/* Action Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-muted-foreground/10 sticky top-0 bg-inherit z-20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Palette className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-sm font-bold tracking-tight">Color Studio</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTextPreview(!showTextPreview)}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            title={showTextPreview ? "Hide Text Preview" : "Show Text Preview"}
          >
            {showTextPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          
          <div className="h-4 w-px bg-muted-foreground/20 mx-1" />

          <button
            onClick={generateCSSVariables}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-all text-primary"
          >
            <FileCode className="h-3.5 w-3.5" />
            CSS Vars
          </button>
          <button
            onClick={generateTailwindConfig}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-all"
          >
            <Copy className="h-3.5 w-3.5" />
            Tailwind
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Palettes</h3>
            <span className="text-[10px] font-medium text-muted-foreground opacity-60">
              {payload.colors.length} colors identified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {payload.colors.map((color, idx) => {
              const hex = normalizeToHex(color);
              const contrastText = getContrastText(color);
              const { isAA, isAAA } = checkWCAGContrast(color, '#FFFFFF');
              const { isAA: isAAOnBlack, isAAA: isAAAOnBlack } = checkWCAGContrast(color, '#000000');

              return (
                <motion.div
                  key={`${color}-${idx}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative flex flex-col rounded-2xl border border-muted-foreground/10 bg-muted/5 overflow-hidden shadow-sm"
                >
                  {/* Swatch */}
                  <div 
                    className="h-24 w-full relative cursor-pointer"
                    style={{ 
                      backgroundColor: 'white',
                      backgroundImage: 'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)',
                      backgroundSize: '10px 10px',
                      backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px'
                    }}
                    onClick={() => handleCopy(color)}
                  >
                    <div 
                      className="absolute inset-0 transition-transform group-hover:scale-105"
                      style={{ backgroundColor: color }}
                    >
                      {showTextPreview && (
                        <div className="h-full w-full flex items-center justify-center p-4">
                          <span 
                            className="text-2xl font-bold leading-tight text-center"
                            style={{ color: contrastText }}
                          >
                            Aa
                          </span>
                        </div>
                      )}

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                        <div className="bg-black/40 backdrop-blur-md rounded-full p-2 text-white shadow-xl">
                          <Copy className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <code className="text-xs font-mono font-bold tracking-tight">{hex}</code>
                      <div className="flex items-center gap-2">
                        {isAAA ? (
                          <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20">AAA</span>
                        ) : isAA ? (
                          <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20">AA</span>
                        ) : (
                          <span className="text-[9px] font-black bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded border border-rose-500/20">FAIL</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-medium">
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-white border border-black/10" />
                        <span>White: {isAA ? "Pass" : "Fail"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-black" />
                        <span>Black: {isAAOnBlack ? "Pass" : "Fail"}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {payload.gradients && payload.gradients.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">Gradients</h3>
            <div className="grid grid-cols-1 gap-4">
              {payload.gradients.map((grad, i) => (
                <div 
                  key={i}
                  className="h-20 rounded-2xl border border-muted-foreground/10 overflow-hidden cursor-pointer group relative"
                  onClick={() => handleCopy(grad)}
                >
                  <div className="absolute inset-0" style={{ background: grad }} />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
                      Copy Linear Gradient
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Info Footer */}
      <div className="px-6 py-4 bg-muted/30 border-t border-muted-foreground/10 text-[10px] text-muted-foreground/70 flex items-center gap-2">
        <Info className="h-3 w-3" />
        Contrast ratings based on WCAG 2.1 relative luminance standards.
      </div>
    </div>
  );
};
