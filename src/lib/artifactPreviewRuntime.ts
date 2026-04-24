import type { PreviewTransformer, PreviewTransformerKind } from './artifactPreview';
import {
  ArtifactTransformCache,
  buildPreviewErrorSummary,
  transformReactArtifactWithCache,
} from './artifactPreview';

const BABEL_RUNTIME_ASSET = '/artifact-runtime/babel.min.js';
const ESBUILD_WASM_ASSET = '/artifact-runtime/esbuild.wasm';
const PREVIEW_MESSAGE_SOURCE = 'finch-artifact-preview';
const TRANSFORMER_FLAG_KEY = 'finch.artifactPreview.transformer';
const REACT_PREVIEW_CANDIDATES = ['App', 'Page', 'Component', 'Main', 'Root', 'Index'];
const REACT_PREVIEW_RUNTIME_VERSION = 'react19-preview-v2';
const REACT_PREVIEW_LIMITS = {
  maxCharacters: 160_000,
  maxLines: 4_000,
};

type PreparedReactPreview = {
  html: string;
  key: string;
  cacheStatus: 'hit' | 'miss';
  transformMs: number;
  transformerKind: PreviewTransformerKind;
  transformerVersion: string;
  externalImports: string[];
};

type PreviewWindow = Window & {
  Babel?: {
    transform: (
      source: string,
      options: {
        filename: string;
        sourceType: 'script' | 'module';
        presets: Array<string | [string, Record<string, unknown>]>;
      },
    ) => { code?: string };
  };
};

const transformCache = new ArtifactTransformCache({
  maxEntries: 24,
  maxBytes: 3_500_000,
});

let babelTransformerPromise: Promise<PreviewTransformer> | null = null;
let esbuildTransformerPromise: Promise<PreviewTransformer> | null = null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeInlineScript(value: string): string {
  return value.replace(/<\/script/gi, '<\\/script');
}

function buildPreviewErrorHtml({
  title,
  details,
  isDark,
}: {
  title: string;
  details: string;
  isDark: boolean;
}): string {
  const bgColor = isDark ? '#111111' : '#ffffff';
  const textColor = isDark ? '#f8f8f8' : '#1f2328';
  const errorBg = isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)';
  const errorBorder = 'rgba(239,68,68,0.3)';
  const errorText = isDark ? '#fca5a5' : '#dc2626';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box}
body{
  margin:16px;
  font-family:system-ui,-apple-system,sans-serif;
  background:${bgColor};
  color:${textColor};
}
.preview-error{
  padding:16px;
  border-radius:12px;
  background:${errorBg};
  border:1px solid ${errorBorder};
  color:${errorText};
}
.preview-error h2{
  margin:0 0 10px;
  font-size:14px;
}
.preview-error pre{
  margin:0;
  white-space:pre-wrap;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  font-size:12px;
  line-height:1.45;
}
</style>
</head>
<body>
  <div class="preview-error">
    <h2>${escapeHtml(title)}</h2>
    <pre>${escapeHtml(details)}</pre>
  </div>
</body>
</html>`;
}

function buildReactPreviewHtml({
  compiledJs,
  isDark,
  metrics,
}: {
  compiledJs: string;
  isDark: boolean;
  metrics: Omit<PreparedReactPreview, 'html'>;
}): string {
  const bgColor = isDark ? '#111111' : '#ffffff';
  const textColor = isDark ? '#f8f8f8' : '#1f2328';
  const note = metrics.externalImports.length
    ? `Non-React imports were stripped for sandbox preview: ${metrics.externalImports.join(', ')}.`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/artifact-runtime/react.production.min.js"></script>
<script src="/artifact-runtime/react-dom.production.min.js"></script>
<style>
*{box-sizing:border-box}
body{
  margin:16px;
  font-family:system-ui,-apple-system,sans-serif;
  background:${bgColor};
  color:${textColor};
  transition: background-color 0.2s, color 0.2s;
}
button {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
  background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
  color: inherit;
  cursor: pointer;
  font-size: 14px;
}
button:hover {
  background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
}
.preview-error{
  padding:16px;
  border-radius:8px;
  background:${isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)'};
  border:1px solid rgba(239,68,68,0.3);
  color:${isDark ? '#fca5a5' : '#dc2626'};
  font-family:monospace;
  font-size:13px;
  white-space:pre-wrap;
}
</style>
</head>
<body>
<div id="root"></div>
<script>
const __PREVIEW_META = ${escapeInlineScript(JSON.stringify({
    source: PREVIEW_MESSAGE_SOURCE,
    cacheStatus: metrics.cacheStatus,
    transformMs: Number(metrics.transformMs.toFixed(2)),
    transformerKind: metrics.transformerKind,
    transformerVersion: metrics.transformerVersion,
    key: metrics.key,
    externalImports: metrics.externalImports,
  }))};
const __PREVIEW_NOTE = ${JSON.stringify(note)};
const __PREVIEW_ROOT = document.getElementById('root');
function __reportPreview(type, payload) {
  window.parent?.postMessage({ ...__PREVIEW_META, type, ...payload }, '*');
}
function __renderPreviewError(category, errorLike) {
  const message = typeof errorLike === 'string'
    ? errorLike
    : errorLike?.stack || errorLike?.message || String(errorLike);
  const bounded = String(message).split('\\n').slice(0, 4).join('\\n');
  const note = __PREVIEW_NOTE ? '\\n\\n' + __PREVIEW_NOTE : '';
  __PREVIEW_ROOT.innerHTML = '<div class="preview-error">' + bounded.replace(/</g, '&lt;') + note.replace(/</g, '&lt;') + '</div>';
  __reportPreview('error', { category, message: bounded, note: __PREVIEW_NOTE });
}
window.addEventListener('error', (event) => {
  __renderPreviewError('runtime', event.error || event.message || 'Unknown runtime error');
});
window.addEventListener('unhandledrejection', (event) => {
  __renderPreviewError('runtime', event.reason || 'Unhandled preview promise rejection');
});
try {
  const { useState, useEffect, useRef, useCallback, useMemo, useReducer, useContext, createContext, forwardRef, memo } = React;
  var __RC;
  const __renderStart = performance.now();
  ${escapeInlineScript(compiledJs)}
  const _root = __RC || (() => {
    for (const candidate of ${JSON.stringify(REACT_PREVIEW_CANDIDATES)}) {
      try {
        if (typeof eval(candidate) === 'function') return eval(candidate);
      } catch (_err) {
        // Candidate not defined in snippet.
      }
    }
    return null;
  })();
  if (_root) {
    ReactDOM.createRoot(__PREVIEW_ROOT).render(React.createElement(_root));
    requestAnimationFrame(() => {
      __reportPreview('render', { renderMs: Number((performance.now() - __renderStart).toFixed(2)) });
    });
  } else {
    __renderPreviewError('runtime', 'Could not detect a React component to render. Export a default component named App, Page, Component, Main, Root, or Index.');
  }
} catch (error) {
  __renderPreviewError('runtime', error);
}
</script>
</body>
</html>`;
}

function getPreviewTransformerPreference(): PreviewTransformerKind {
  try {
    return window.localStorage.getItem(TRANSFORMER_FLAG_KEY) === 'esbuild' ? 'esbuild' : 'babel';
  } catch {
    return 'babel';
  }
}

function loadWindowScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-artifact-preview="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.artifactPreview = src;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

async function getBabelTransformer(): Promise<PreviewTransformer> {
  if (!babelTransformerPromise) {
    babelTransformerPromise = (async () => {
      const previewWindow = window as PreviewWindow;
      if (!previewWindow.Babel) {
        await loadWindowScript(BABEL_RUNTIME_ASSET);
      }

      const babel = (window as PreviewWindow).Babel;
      if (!babel) {
        throw new Error('Babel runtime did not initialize.');
      }

      return {
        kind: 'babel',
        version: REACT_PREVIEW_RUNTIME_VERSION,
        async transform(source: string) {
          const result = babel.transform(source, {
            filename: 'artifact-preview.tsx',
            sourceType: 'script',
            presets: [
              ['typescript', { allExtensions: true, isTSX: true }],
              'react',
            ],
          });

          if (!result.code) {
            throw new Error('Babel transform produced no output.');
          }

          return result.code;
        },
      };
    })();
  }

  return babelTransformerPromise;
}

async function getEsbuildTransformer(): Promise<PreviewTransformer> {
  if (!esbuildTransformerPromise) {
    esbuildTransformerPromise = (async () => {
      const esbuild = await import('esbuild-wasm');
      await esbuild.initialize({
        wasmURL: ESBUILD_WASM_ASSET,
        worker: false,
      });

      return {
        kind: 'esbuild',
        version: `esbuild-${esbuild.version}`,
        async transform(source: string) {
          const result = await esbuild.transform(source, {
            loader: 'tsx',
            jsx: 'transform',
            jsxFactory: 'React.createElement',
            jsxFragment: 'React.Fragment',
            target: 'es2020',
          });

          if (!result.code) {
            throw new Error('esbuild transform produced no output.');
          }

          return result.code;
        },
      };
    })();
  }

  return esbuildTransformerPromise;
}

async function getPreviewTransformer(): Promise<PreviewTransformer> {
  const preferred = getPreviewTransformerPreference();
  if (preferred === 'esbuild') {
    try {
      return await getEsbuildTransformer();
    } catch (error) {
      console.debug('[artifact-preview] esbuild initialization failed; falling back to Babel', error);
    }
  }
  return getBabelTransformer();
}

export async function prepareReactPreview({
  content,
  isDark,
}: {
  content: string;
  isDark: boolean;
}): Promise<PreparedReactPreview> {
  const lineCount = content.split('\n').length;
  if (content.length > REACT_PREVIEW_LIMITS.maxCharacters || lineCount > REACT_PREVIEW_LIMITS.maxLines) {
    const details = buildPreviewErrorSummary(
      'limits',
      `Preview skipped for a large artifact (${content.length} chars, ${lineCount} lines). Download or open it in the editor instead.`,
    );
    return {
      html: buildPreviewErrorHtml({
        title: 'Preview limit reached',
        details,
        isDark,
      }),
      key: `limits:${content.length}:${lineCount}:${isDark ? 'dark' : 'light'}`,
      cacheStatus: 'miss',
      transformMs: 0,
      transformerKind: 'babel',
      transformerVersion: REACT_PREVIEW_RUNTIME_VERSION,
      externalImports: [],
    };
  }

  try {
    const transformer = await getPreviewTransformer();
    const transformed = await transformReactArtifactWithCache({
      content,
      kind: 'react',
      language: 'tsx',
      runtimeVersion: REACT_PREVIEW_RUNTIME_VERSION,
      transformer,
      cache: transformCache,
    });

    const preview = {
      ...transformed,
      html: '',
    };

    return {
      ...preview,
      html: buildReactPreviewHtml({
        compiledJs: transformed.compiledJs,
        isDark,
        metrics: preview,
      }),
    };
  } catch (error) {
    const details = buildPreviewErrorSummary('transform', error);
    return {
      html: buildPreviewErrorHtml({
        title: 'Preview transform failed',
        details,
        isDark,
      }),
      key: `transform-error:${content.length}:${isDark ? 'dark' : 'light'}`,
      cacheStatus: 'miss',
      transformMs: 0,
      transformerKind: 'babel',
      transformerVersion: REACT_PREVIEW_RUNTIME_VERSION,
      externalImports: [],
    };
  }
}

export function logPreparedPreviewMetrics(metrics: Omit<PreparedReactPreview, 'html'>) {
  console.debug('[artifact-preview] transform', {
    key: metrics.key,
    cacheStatus: metrics.cacheStatus,
    transformMs: metrics.transformMs,
    transformerKind: metrics.transformerKind,
    transformerVersion: metrics.transformerVersion,
    externalImports: metrics.externalImports,
    cacheStats: transformCache.getStats(),
  });
}

export function isArtifactPreviewMessage(event: MessageEvent): boolean {
  return Boolean(
    event.data
      && typeof event.data === 'object'
      && event.data.source === PREVIEW_MESSAGE_SOURCE,
  );
}
