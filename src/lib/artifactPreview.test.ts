/**
 * Lightweight tests for artifact preview transform helpers.
 * Run with: npx tsx src/lib/artifactPreview.test.ts
 */
import assert from 'node:assert/strict';
import {
  ArtifactTransformCache,
  buildPreviewErrorSummary,
  createArtifactTransformKey,
  normalizeReactPreviewSource,
  transformReactArtifactWithCache,
  type PreviewTransformer,
} from './artifactPreview.js';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  ✓ ${name}`);
      passed++;
    })
    .catch((err: any) => {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      failed++;
    });
}

console.log('\nnormalizeReactPreviewSource');

test('rewrites aliased React imports into runtime-safe aliases', () => {
  const result = normalizeReactPreviewSource(
    "import React, { useState as useSt, Fragment } from 'react';\nexport default () => { useSt(0); return <Fragment />; };",
  );

  assert.ok(!result.code.includes("from 'react'"));
  assert.ok(result.prelude.includes('const useSt = useState;'));
  assert.ok(result.prelude.includes('const Fragment = React.Fragment;'));
  assert.ok(result.code.includes('var __RC = () =>'));
});

test('tracks stripped non-React imports for diagnostics', () => {
  const result = normalizeReactPreviewSource(
    "import { Button } from './Button';\nexport default function App() { return <Button />; }",
  );

  assert.equal(result.externalImports.length, 1);
  assert.ok(!result.code.includes("from './Button'"));
});

test('keeps named components renderable without a default export', () => {
  const result = normalizeReactPreviewSource(
    'function App() { return <div>Hello</div>; }',
  );

  assert.ok(result.code.includes('function App()'));
  assert.equal(result.defaultExportAssigned, false);
});

console.log('\ncreateArtifactTransformKey');

test('produces stable keys and changes when runtime version changes', () => {
  const base = {
    content: 'export default function App() { return <div />; }',
    kind: 'react' as const,
    language: 'tsx',
    transformerKind: 'babel' as const,
  };

  const keyA = createArtifactTransformKey({ ...base, runtimeVersion: 'runtime-v1' });
  const keyB = createArtifactTransformKey({ ...base, runtimeVersion: 'runtime-v1' });
  const keyC = createArtifactTransformKey({ ...base, runtimeVersion: 'runtime-v2' });

  assert.equal(keyA, keyB);
  assert.notEqual(keyA, keyC);
});

console.log('\nArtifactTransformCache');

test('reuses cached transform results for identical preview inputs', async () => {
  let transformCalls = 0;
  const cache = new ArtifactTransformCache({ maxEntries: 4, maxBytes: 10_000 });
  const transformer: PreviewTransformer = {
    kind: 'babel',
    version: '7.0.0-test',
    async transform(source) {
      transformCalls++;
      return `compiled:${source.length}`;
    },
  };

  const input = {
    content: 'export default function App() { return <div />; }',
    kind: 'react' as const,
    language: 'tsx',
    runtimeVersion: 'runtime-v1',
    transformer,
    cache,
  };

  const first = await transformReactArtifactWithCache(input);
  const second = await transformReactArtifactWithCache(input);

  assert.equal(first.cacheStatus, 'miss');
  assert.equal(second.cacheStatus, 'hit');
  assert.equal(transformCalls, 1);
});

test('evicts the least recently used transform when limits are exceeded', () => {
  const cache = new ArtifactTransformCache({ maxEntries: 2, maxBytes: 60 });

  cache.set('a', { compiledJs: 'alpha', bytes: 20, transformerKind: 'babel', transformerVersion: '1', externalImports: [] });
  cache.set('b', { compiledJs: 'bravo', bytes: 20, transformerKind: 'babel', transformerVersion: '1', externalImports: [] });
  cache.get('a');
  cache.set('c', { compiledJs: 'charlie', bytes: 20, transformerKind: 'babel', transformerVersion: '1', externalImports: [] });

  assert.ok(cache.get('a'));
  assert.equal(cache.get('b'), undefined);
  assert.ok(cache.get('c'));
});

console.log('\nbuildPreviewErrorSummary');

test('labels transform errors and bounds the snippet length', () => {
  const summary = buildPreviewErrorSummary(
    'transform',
    new Error('line1\nline2\nline3\nline4'),
  );

  assert.ok(summary.startsWith('Transform error:'));
  assert.ok(!summary.includes('line4'));
});

setTimeout(() => {
  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}, 0);
