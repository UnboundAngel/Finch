# Component Map: ChatInput.tsx

Modular breakdown and anatomy of the `ChatInput` component to identify extraction points and reduce complexity.

## Component Overview
- **File:** `src/components/chat/ChatInput.tsx`
- **Line Count:** 512 lines
- **Responsibility:** Manages message input, file attachments, web search configuration, voice recording, and AI model marketplace entry.

## Anatomy

### 1. Imports & Types (L1–66)
- **UI Components:** `Button`, `Popover`, `DropdownMenu`, `VoiceIndicator`, `ModelMarketplace`, `SearchOnboarding`.
- **Icons:** `lucide-react` (Paperclip, Globe, Send, Square, Mic, MicOff, etc.).
- **Hooks:** `useVoiceTranscription`.
- **Tauri IPC:** `invoke`, `openUrl`.
- **Props Interface:** `ChatInputProps` covers input state, search toggles, theme flags, and voice state.

### 2. Internal State & Refs (L67–102)
- **Refs:** `textareaRef` (auto-resize), `fileInputRef` (hidden file picker).
- **Config State:** `config`, `configLoaded` (API keys for search).
- **Onboarding:** `showOnboarding`, `onboardingStep`.
- **Search:** `activeSearchProvider`, `isSearchMenuOpen`.
- **Audio/Mic:** `isMicMenuOpen`, `audioDevices`, `selectedDevice`.

### 3. Logic & Hooks (L104–146)
- **Config Loader:** `useEffect` calling `get_provider_config`.
- **Device Loader:** `fetchDevices` calling `list_audio_devices`.
- **Voice Hook:** `useVoiceTranscription` for handling recording logic and transcription results.
- **UI Helpers:** `getSkeletonStyles` for theme-aware shimmer.

### 4. Layout & Styling (L148–203)
- **Global CSS:** Dynamic `@keyframes shimmer-sweep` for the skeleton.
- **Outer Wrapper:** `max-w-3xl` container with responsive padding.
- **Inner Container:** Complex conditional `className` logic (L186–203) for border colors based on `isModelLoaded`, `isWebSearchActive`, `isIncognito`, and `isPinkMode`.

### 5. JSX Sections

#### A. Attachment Preview (L205–218)
- Displays `attachedFile` name with a remove button.
- **Seam:** Can be extracted into `AttachmentPreview.tsx`.

#### B. Main Input Area (L220–235)
- **Skeleton:** Shown during `isTranscribing`.
- **Textarea:** Standard message input with `auto-resize` and `handleKeyDown`.
- **Seam:** Can be extracted into `InputArea.tsx`.

#### C. Control Bar (L237–507)
- **Attachment Button:** `Paperclip` icon triggering `fileInputRef`.
- **Web Search Control (L256–382):**
    - `Globe` button with multi-modal behavior:
        - Toggle Search (if keys exist).
        - Open Onboarding (if keys missing).
        - Context Menu for Provider Selection and API editing.
    - **Seam:** High-priority extraction to `WebSearchControl.tsx`.
- **Voice/Mic Control (L385–448):**
    - `Mic` button toggling recording.
    - Context Menu for device selection.
    - **Seam:** High-priority extraction to `VoiceControl.tsx`.
- **Action Button (L450–462):**
    - Toggles between `Send` and `Square` (Stop) based on `isThinking`.
    - **Seam:** Can be extracted into `ActionButton.tsx`.

#### D. Disclaimer (L508–512)
- Small text footer warning about AI mistakes.

## Logic Blocks (Event Handlers)
- `handleKeyDown` (L131–136): Logic for Enter-to-send.
- `handleFileChange` (L138–146): Logic for setting the attached file.
- `handleMicClick` (L148–158): Logic for recording vs. marketplace.

## Key Seams & Decoupling Strategy

1. **`useChatInputConfig.ts`**: Extract `get_provider_config`, `update_search_config`, and `fetchDevices` logic.
2. **`AttachmentSection.tsx`**: Combine the `Paperclip` button and the preview pill.
3. **`WebSearchControl.tsx`**: Isolate the complex logic of `Globe` + `Popover` (Onboarding) + `DropdownMenu` (Settings).
4. **`VoiceControl.tsx`**: Isolate the `Mic` button + Device selection + `VoiceIndicator` wrapper.
5. **`InputArea.tsx`**: Encapsulate the `textarea`, `auto-resize` useEffect, and transcription skeleton.

## Dependencies
- **Zustand:** Not used directly in `ChatInput` (props are passed down), though it consumes `useVoiceTranscription` which likely uses a store.
- **Tailwind:** Heavy use of conditional classes for theme and state-based styling.
- **Lucide:** Integrated for all iconography.
