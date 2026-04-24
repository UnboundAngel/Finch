# Studio Workspace Roadmap

## Purpose Statement
**"To move AI from a linear conversation to a spatial workshop—transforming ephemeral chat responses into persistent, relational, and actionable design artifacts."**

## Competitive Positioning
*   **Finch vs. Figma Weave**: While Weave targets granular visual asset compositing (outpainting, relighting), Finch targets conversational context capture for functional application blueprints and code logic.
*   **Finch vs. Miro AI**: Miro provides spatial memory via unstructured whiteboarding. Finch uses structured direct-DOM nodes to bridge conversational discovery with application creation.
*   **Finch vs. Banana Pro AI Studio**: Banana Pro acts as a visual interface for generative media pipelines. Finch anchors conversational concepts to solve "context burial" in professional workflows.

## Technical Foundation: Token Cost & History Strategy
To maintain performance and minimize token costs, the Studio Workspace follows a **"Store the Prompt, Not the Output"** strategy:
*   **Flat Context Scaling**: Each `PaletteNode` stores its original `sourcePrompt`.
*   **Regeneration**: Handled by replaying the `sourcePrompt` rather than feeding previous JSON back into context.
*   **Refinement**: Context is limited to `STUDIO_SYSTEM_PROMPT` + Targeted Node JSON + User Instruction.
*   **Constraint**: Never feed the entire `nodes[]` array into a studio request.

---

## Implementation Roadmap

### Phase 1: Foundation & Core Utility (High Value / Low Risk)
**Goal**: Establish node persistence and fundamental canvas ergonomics.
- [ ] **1. Source Prompt Persistence**: Add `sourcePrompt` to the `PaletteNode` interface and store it during generation to enable cost-effective regeneration.
- [ ] **2. In-Node Refinement**: Implement a "Refine" button on node cards that contextually links the selected node to the ChatInput for targeted adjustments.
- [ ] **3. Canvas Zoom**: Enable wheel-based zooming for the infinite canvas to improve navigation as node density increases.
- [ ] **4. Snap-to-Grid & Clean Up**: Implement alignment logic to allow users to organize nodes precisely.
- [ ] **5. Eject to Chat Bridge**: Add a one-tap action to send a node's data into the active chat session for further discussion or document integration.

### Phase 2: Visibility & Expansion (Moderate Lift)
**Goal**: Improve workspace manageability and introduce basic multi-modal support.
- [ ] **6. Minimap**: Implement a high-level navigation overlay for large-scale canvases.
- [ ] **7. Note/Markdown Nodes**: Expand node types to include simple text/markdown cards for requirements and brainstorming.
- [ ] **8. SVG/Asset Nodes**: Enable the generation and rendering of raw SVG assets directly on the canvas.

### Phase 3: Advanced Iteration (Proceed with Caution)
**Goal**: Deep history and complex relationship management.
- [ ] **9. Version History**: Implement "version stacks" within nodes to allow users to scrub through previous iterations of a design.
- [ ] **10. Relational Architecture**: (Future V2) Explore visual connections (arrows) and contextual inheritance between nodes.
