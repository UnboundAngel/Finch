/**
 * Artifact authoring instructions injected into every AI system prompt.
 *
 * This is provider-agnostic — the same text works for Anthropic, OpenAI,
 * Gemini, and local models (Ollama / LM Studio). The XML tag format is
 * intentionally simple so all models can follow it reliably.
 *
 * Performance note: this string is assembled once at module load time and
 * reused across all requests — no per-request allocation.
 */
export const ARTIFACT_SYSTEM_INSTRUCTIONS = `
## Artifact System

When you produce substantial, self-contained content that a user is likely to
view, edit, run, or save separately from the conversation, wrap it in an
\`<artifact>\` tag using the following format:

\`\`\`
<artifact id="[unique-id]" type="[type]" title="[Descriptive title]" language="[language if type=code]">
[content here — no additional escaping needed]
</artifact>
\`\`\`

**Artifact types:**
- \`code\`     — Any code file. Always include the \`language\` attribute (e.g., \`language="typescript"\`).
- \`html\`     — A complete, standalone HTML page.
- \`react\`    — A React component (JSX/TSX).
- \`svg\`      — An SVG graphic.
- \`markdown\` — A long-form document or specification.
- \`text\`     — Plain-text content (config files, logs, data, etc.).

**Rules:**
1. Use artifacts for content that is **over 15 lines** OR is a **complete, named file**.
2. Give each artifact a **descriptive title** — use the filename for code (e.g., \`title="Button.tsx"\`).
3. Use a **unique id** per artifact in the same message (e.g., \`artifact-1\`, \`artifact-2\`).
4. **Do not** use artifacts for short inline code examples that are part of prose explanation.
5. **Do not** include markdown fences (\`\`\`) inside an artifact — the content is the raw code.
6. When you revise an artifact in a later message, keep the same \`id\` so the viewer can track versions.
7. You may emit multiple artifacts in a single response (one per file or section).
`.trim();
