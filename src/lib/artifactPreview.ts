import type { ArtifactKind } from '@/src/types/chat';

export type PreviewTransformerKind = 'babel' | 'esbuild';
export type PreviewErrorCategory = 'transform' | 'runtime' | 'limits';

export type PreviewTransformer = {
  kind: PreviewTransformerKind;
  version: string;
  transform: (source: string) => Promise<string>;
};

export type NormalizedReactPreviewSource = {
  code: string;
  prelude: string;
  externalImports: string[];
  defaultExportAssigned: boolean;
};

export type ArtifactTransformCacheEntry = {
  compiledJs: string;
  bytes: number;
  transformerKind: PreviewTransformerKind;
  transformerVersion: string;
  externalImports: string[];
  hits?: number;
};

export type ArtifactTransformResult = {
  key: string;
  compiledJs: string;
  cacheStatus: 'hit' | 'miss';
  transformMs: number;
  transformerKind: PreviewTransformerKind;
  transformerVersion: string;
  externalImports: string[];
};

const PREBOUND_REACT_IDENTIFIERS = new Set([
  'useState',
  'useEffect',
  'useRef',
  'useCallback',
  'useMemo',
  'useReducer',
  'useContext',
  'createContext',
  'forwardRef',
  'memo',
]);

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n/g, '\n');
}

function estimateBytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function uniquePush(target: string[], value: string) {
  if (value && !target.includes(value)) {
    target.push(value);
  }
}

function parseReactImportSpecifier(specifier: string, aliasLines: string[]) {
  const cleaned = specifier.trim();
  if (!cleaned) return;

  const namedStart = cleaned.indexOf('{');
  const namedEnd = cleaned.lastIndexOf('}');
  const namedPart = namedStart >= 0 && namedEnd > namedStart
    ? cleaned.slice(namedStart + 1, namedEnd)
    : '';

  const beforeNamed = namedStart >= 0 ? cleaned.slice(0, namedStart).replace(/,$/, '').trim() : cleaned;

  if (beforeNamed) {
    if (beforeNamed.startsWith('*')) {
      const match = beforeNamed.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
      if (match && match[1] !== 'React') {
        uniquePush(aliasLines, `const ${match[1]} = React;`);
      }
    } else {
      const defaultImport = beforeNamed.replace(/,$/, '').trim();
      if (defaultImport && defaultImport !== 'React') {
        uniquePush(aliasLines, `const ${defaultImport} = React;`);
      }
    }
  }

  for (const rawEntry of namedPart.split(',')) {
    const entry = rawEntry.trim().replace(/^type\s+/, '');
    if (!entry) continue;

    const [importedRaw, localRaw] = entry.split(/\s+as\s+/).map((part) => part.trim());
    const imported = importedRaw;
    const local = localRaw || importedRaw;

    if (!imported || !local) continue;
    if (imported === local && PREBOUND_REACT_IDENTIFIERS.has(imported)) continue;

    if (PREBOUND_REACT_IDENTIFIERS.has(imported)) {
      uniquePush(aliasLines, `const ${local} = ${imported};`);
    } else {
      uniquePush(aliasLines, `const ${local} = React.${imported};`);
    }
  }
}

export function normalizeReactPreviewSource(source: string): NormalizedReactPreviewSource {
  const aliasLines: string[] = [];
  const externalImports: string[] = [];

  let code = normalizeLineEndings(source);

  code = code.replace(
    /^\s*import\s+([\s\S]*?)\s+from\s+['"]react['"];?\s*$/gm,
    (_full, specifier) => {
      parseReactImportSpecifier(specifier, aliasLines);
      return '';
    },
  );

  code = code.replace(
    /^\s*import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?\s*$/gm,
    (_full, _specifier, moduleName) => {
      uniquePush(externalImports, moduleName);
      return '';
    },
  );

  code = code.replace(
    /^\s*import\s+['"]([^'"]+)['"];?\s*$/gm,
    (_full, moduleName) => {
      uniquePush(externalImports, moduleName);
      return '';
    },
  );

  code = code
    .replace(/export\s*\{\s*([A-Za-z_$][\w$]*)\s+as\s+default\s*\};?/g, 'var __RC = $1;')
    .replace(/export\s+default\s+async\s+function\s+([A-Za-z_$][\w$]*)/g, 'var __RC = async function $1')
    .replace(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)/g, 'var __RC = function $1')
    .replace(/export\s+default\s+class\s+([A-Za-z_$][\w$]*)/g, 'var __RC = class $1')
    .replace(/export\s+default\s+class\b/g, 'var __RC = class')
    .replace(/export\s+default\s+/g, 'var __RC = ')
    .replace(/(^|\n)\s*export\s+(const|let|var|function|class)\s+/g, '$1$2 ')
    .trim();

  return {
    code,
    prelude: aliasLines.join('\n'),
    externalImports,
    defaultExportAssigned: /var __RC\s*=/.test(code),
  };
}

export function createArtifactTransformKey({
  content,
  kind,
  language,
  runtimeVersion,
  transformerKind,
}: {
  content: string;
  kind: ArtifactKind;
  language?: string;
  runtimeVersion: string;
  transformerKind: PreviewTransformerKind;
}): string {
  const normalized = normalizeLineEndings(content);
  return [
    kind,
    language || 'plain',
    transformerKind,
    runtimeVersion,
    fnv1a32(normalized),
  ].join(':');
}

export function buildPreviewErrorSummary(
  category: PreviewErrorCategory,
  error: unknown,
  maxLines = 3,
): string {
  const label = category === 'transform'
    ? 'Transform error'
    : category === 'limits'
      ? 'Preview limit reached'
      : 'Runtime render error';

  const raw = error instanceof Error
    ? error.stack || error.message
    : typeof error === 'string'
      ? error
      : JSON.stringify(error);

  const snippet = (raw || 'Unknown preview error')
    .split('\n')
    .slice(0, maxLines)
    .join('\n');

  return `${label}:\n${snippet}`;
}

export class ArtifactTransformCache {
  private entries = new Map<string, ArtifactTransformCacheEntry>();
  private totalBytes = 0;
  private readonly maxEntries: number;
  private readonly maxBytes: number;

  constructor({
    maxEntries,
    maxBytes,
  }: {
    maxEntries: number;
    maxBytes: number;
  }) {
    this.maxEntries = Math.max(1, maxEntries);
    this.maxBytes = Math.max(1, maxBytes);
  }

  get(key: string): ArtifactTransformCacheEntry | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    this.entries.delete(key);
    entry.hits = (entry.hits || 0) + 1;
    this.entries.set(key, entry);
    return entry;
  }

  set(key: string, entry: ArtifactTransformCacheEntry) {
    const existing = this.entries.get(key);
    if (existing) {
      this.totalBytes -= existing.bytes;
      this.entries.delete(key);
    }

    this.entries.set(key, entry);
    this.totalBytes += entry.bytes;
    this.evictIfNeeded();
  }

  getStats() {
    return {
      entries: this.entries.size,
      bytes: this.totalBytes,
    };
  }

  private evictIfNeeded() {
    while (this.entries.size > this.maxEntries || this.totalBytes > this.maxBytes) {
      const oldestKey = this.entries.keys().next().value;
      if (!oldestKey) break;
      const oldest = this.entries.get(oldestKey);
      this.entries.delete(oldestKey);
      if (oldest) {
        this.totalBytes -= oldest.bytes;
      }
    }
  }
}

export async function transformReactArtifactWithCache({
  content,
  kind,
  language,
  runtimeVersion,
  transformer,
  cache,
}: {
  content: string;
  kind: ArtifactKind;
  language?: string;
  runtimeVersion: string;
  transformer: PreviewTransformer;
  cache: ArtifactTransformCache;
}): Promise<ArtifactTransformResult> {
  const key = createArtifactTransformKey({
    content,
    kind,
    language,
    runtimeVersion,
    transformerKind: transformer.kind,
  });

  const cached = cache.get(key);
  if (cached) {
    return {
      key,
      compiledJs: cached.compiledJs,
      cacheStatus: 'hit',
      transformMs: 0,
      transformerKind: cached.transformerKind,
      transformerVersion: cached.transformerVersion,
      externalImports: cached.externalImports,
    };
  }

  const normalized = normalizeReactPreviewSource(content);
  const sourceForTransformer = [normalized.prelude, normalized.code].filter(Boolean).join('\n');

  const startedAt = performance.now();
  const compiledJs = await transformer.transform(sourceForTransformer);
  const transformMs = performance.now() - startedAt;

  cache.set(key, {
    compiledJs,
    bytes: estimateBytes(compiledJs),
    transformerKind: transformer.kind,
    transformerVersion: transformer.version,
    externalImports: normalized.externalImports,
  });

  return {
    key,
    compiledJs,
    cacheStatus: 'miss',
    transformMs,
    transformerKind: transformer.kind,
    transformerVersion: transformer.version,
    externalImports: normalized.externalImports,
  };
}
