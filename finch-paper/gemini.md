# Finch Development Mandates

## Critical Research & Verification
- **Double-Check Everything:** ALWAYS verify URLs, API specifications, patches, and update notes before implementing or recommending changes. Never assume an API or library version behaves exactly as a previous one without checking official documentation.

## Design & Aesthetic Standards
- **Prioritize Animations:** Every button and interactive element MUST have a Framer Motion animation (hover, tap, or entrance). UI transitions must feel fluid and intentional.
- **Beautiful & Unique Styling:** Strictly adhere to the "Sketch" (Paper) and "Terminal" (Dark) personalities. Avoid standard geometric UI; use hand-drawn borders, custom shadows, and unique layouts that reinforce the project's identity.
- **Physical Feel:** In Sketch mode, prioritize elements that look like physical objects (sticky notes, notebooks, tape, paper texture).

## Architecture & Performance
- **Atomic Components:** Split component files aggressively. Keep files small and focused. Each component should live in its own file within `src/components` for ease of editing and better performance (preventing unnecessary re-renders).
- **Clean Structure:** Use `src/components/ui` for shared visual primitives and icons.

## Known UI Fixes
- **No Overlaps:** Ensure window controls (Minimize, Maximize, Close) NEVER overlap with application-level buttons like theme toggles. Use fixed safe zones for Tauri window controls.
