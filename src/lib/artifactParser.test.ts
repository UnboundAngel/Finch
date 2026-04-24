/**
 * Lightweight tests for artifactParser.ts.
 * Run with:  npx tsx src/lib/artifactParser.test.ts
 * No external test framework required — uses Node's built-in assert.
 */
import assert from 'node:assert/strict';
import { parseContentSegments, extractArtifacts, stripArtifacts } from './artifactParser.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

// ─── parseContentSegments ────────────────────────────────────────────────────

console.log('\nparseContentSegments');

test('parses a real artifact block as an artifact segment', () => {
  const input = `Here is a counter:\n<artifact id="a1" type="react" title="Counter">\nfunction Counter() { return <div>0</div>; }\n</artifact>\nSome trailing prose.`;
  const segs = parseContentSegments(input);
  const kinds = segs.map(s => s.type);
  assert.deepEqual(kinds, ['text', 'artifact', 'text']);
  assert.equal(segs[1].type === 'artifact' && segs[1].artifact.title, 'Counter');
});

test('small-model fence-wrapped artifact is parsed as an artifact', () => {
  // Small models like llama-3.2 wrap their real artifact output in triple backticks.
  const input = `Here's the component:\n\`\`\`jsx\n<artifact id="counter" type="react" title="Counter">function Counter() { return <div>0</div>; }\n</artifact>\n\`\`\``;
  const segs = parseContentSegments(input);
  const artifacts = segs.filter(s => s.type === 'artifact');
  assert.equal(artifacts.length, 1, 'Expected fenced artifact to be parsed');
  assert.equal(artifacts[0].type === 'artifact' && artifacts[0].artifact.id, 'counter');
});

test('fence wrapper text does not leak into surrounding text segments', () => {
  const input = `Prose.\n\`\`\`jsx\n<artifact id="a" type="react" title="A">code</artifact>\n\`\`\`\nMore prose.`;
  const segs = parseContentSegments(input);
  const textContent = segs.filter(s => s.type === 'text').map(s => (s as any).content).join('');
  assert.ok(!textContent.includes('```'), 'Backtick fence delimiters should not appear in text segments');
});

test('multiple artifacts parse with correct version numbers', () => {
  const input = `<artifact id="a1" type="text" title="A">x</artifact>\n<artifact id="a2" type="text" title="B">y</artifact>`;
  const segs = parseContentSegments(input);
  const arts = segs.filter(s => s.type === 'artifact');
  assert.equal(arts.length, 2);
  assert.equal(arts[0].type === 'artifact' && arts[0].artifact.version, 1);
  assert.equal(arts[1].type === 'artifact' && arts[1].artifact.version, 2);
});

test('drops trailing "undefined" sentinel (exact)', () => {
  const input = `<artifact id="a1" type="text" title="T">hello</artifact>undefined`;
  const segs = parseContentSegments(input);
  assert.ok(segs.every(s => s.type !== 'text' || (s as any).content.trim() !== 'undefined'));
});

test('drops trailing "undefined" sentinel with surrounding whitespace', () => {
  const input = `<artifact id="a1" type="text" title="T">hello</artifact>\n undefined \n`;
  const segs = parseContentSegments(input);
  assert.ok(segs.every(s => s.type !== 'text' || (s as any).content.trim() !== 'undefined'));
});

test('preserves legitimate prose that happens to contain the word undefined', () => {
  const input = `The value is undefined in JavaScript.`;
  const segs = parseContentSegments(input);
  assert.equal(segs.length, 1);
  assert.equal(segs[0].type, 'text');
});

test('streaming mode: hides incomplete artifact tag at tail', () => {
  const input = `Some text<artifact id="a1" type="react" title="`;
  const segs = parseContentSegments(input, true);
  assert.ok(segs.every(s => s.type === 'text'));
  assert.ok(segs.some(s => s.type === 'text' && (s as any).content.includes('Some text')));
});

test('artifact content is not polluted by surrounding fence syntax', () => {
  const input = `\`\`\`jsx\n<artifact id="x" type="react" title="X">const a = 1;</artifact>\n\`\`\``;
  const segs = parseContentSegments(input);
  const art = segs.find(s => s.type === 'artifact');
  assert.ok(art && art.type === 'artifact');
  assert.ok(!art.artifact.content.includes('```'), 'Artifact content should not include backtick fences');
});

// ─── extractArtifacts ─────────────────────────────────────────────────────────

console.log('\nextractArtifacts');

test('returns all complete artifact objects', () => {
  const input = `<artifact id="a1" type="text" title="First">one</artifact>\n<artifact id="a2" type="code" title="Second" language="ts">two</artifact>`;
  const arts = extractArtifacts(input);
  assert.equal(arts.length, 2);
  assert.equal(arts[0].id, 'a1');
  assert.equal(arts[1].id, 'a2');
  assert.equal(arts[1].language, 'ts');
});

test('returns artifacts even when wrapped in fences', () => {
  const input = `\`\`\`\n<artifact id="real" type="text" title="Real">content</artifact>\n\`\`\``;
  const arts = extractArtifacts(input);
  assert.equal(arts.length, 1);
  assert.equal(arts[0].id, 'real');
});

// ─── stripArtifacts ───────────────────────────────────────────────────────────

console.log('\nstripArtifacts');

test('removes artifact blocks from text', () => {
  const input = `Intro text.\n<artifact id="a1" type="text" title="T">body</artifact>\nOutro text.`;
  const result = stripArtifacts(input);
  assert.ok(!result.includes('<artifact'));
  assert.ok(result.includes('Intro text.'));
  assert.ok(result.includes('Outro text.'));
});

// ─── summary ─────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
