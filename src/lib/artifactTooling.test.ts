/**
 * Lightweight tests for artifact tooling helpers.
 * Run with: npx tsx src/lib/artifactTooling.test.ts
 */
import assert from 'node:assert/strict';
import { ARTIFACT_SYSTEM_INSTRUCTIONS } from './artifactSystemPrompt.js';
import { artifactKindSupportsPreview, buildChatSystemPrompt } from './artifactTooling.js';

let passed = 0;
let failed = 0;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${getErrorMessage(error)}`);
    failed++;
  }
}

console.log('\nbuildChatSystemPrompt');

test('appends UI capability instructions when artifact tool is disabled', () => {
  const basePrompt = 'You are helpful.';
  const result = buildChatSystemPrompt(basePrompt, false);
  assert.ok(result.includes('UI Capabilities'));
  assert.ok(result.includes(basePrompt));
  assert.ok(!result.includes('Artifact System'));
});

test('returns only UI capabilities when no base prompt and artifact tool is disabled', () => {
  const result = buildChatSystemPrompt('', false);
  assert.ok(result.includes('UI Capabilities'));
  assert.ok(!result.includes('Artifact System'));
});

test('appends artifact and UI instructions when artifact tool is enabled', () => {
  const basePrompt = 'You are helpful.';
  const result = buildChatSystemPrompt(basePrompt, true);
  assert.ok(result.includes(basePrompt));
  assert.ok(result.includes('Artifact System'));
  assert.ok(result.includes('UI Capabilities'));
});

test('uses artifact and UI instructions when enabled without a base prompt', () => {
  const result = buildChatSystemPrompt('', true);
  assert.ok(result.includes('Artifact System'));
  assert.ok(result.includes('UI Capabilities'));
});

console.log('\nartifactKindSupportsPreview');

test('supports existing previewable artifact kinds', () => {
  assert.equal(artifactKindSupportsPreview('html'), true);
  assert.equal(artifactKindSupportsPreview('svg'), true);
  assert.equal(artifactKindSupportsPreview('react'), true);
});

test('supports markdown preview in the artifact panel', () => {
  assert.equal(artifactKindSupportsPreview('markdown'), true);
});

test('does not treat plain code artifacts as previewable', () => {
  assert.equal(artifactKindSupportsPreview('code'), false);
  assert.equal(artifactKindSupportsPreview('text'), false);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
