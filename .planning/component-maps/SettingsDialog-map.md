# Component Map: SettingsDialog.tsx

Modular breakdown and anatomy of the `SettingsDialog` component to identify extraction points and reduce complexity.

## Component Overview
- **File:** `src/components/dashboard/SettingsDialog.tsx`
- **Line Count:** 346 lines
- **Responsibility:** Manages application settings, including appearance (theme, custom backgrounds), chat behavior (Enter to Send), data management (clear history), and AI provider configurations (API keys and local endpoints).

## Anatomy

### 1. Imports & Types (L1–47)
- **UI Components:** `Dialog`, `Button`, `Switch` (sky-toggle), `Tabs`, `Label`, `Input`, `AlertDialog`.
- **Icons:** `lucide-react` (Cloud, Cpu, Sparkles, Zap, Key, Globe, RefreshCcw).
- **Hooks:** `framer-motion`.
- **Tauri IPC:** `invoke`.
- **Props Interface:** `SettingsDialogProps` covers visibility, theme state, message/chat state setters, and keyboard behavior.

### 2. Main Component: SettingsDialog (L49–211)
- **State:** `activeTab` (general | models).
- **Animation:** `containerVariants` for staggered entrance.
- **Layout:** `Dialog` wrapper containing `Tabs` for navigation.

### 3. JSX Sections (SettingsDialog)

#### A. Header (L67–74)
- Displays "Settings" title and description.

#### B. Tabs Navigation (L76–82)
- Simple `TabsList` for "General" and "Models & Keys".

#### C. General Tab Content (L85–164)
- **Appearance (L97–141):**
    - Theme toggle (L100–108).
    - Chat Background buttons (L110–140) for Light/Dark/Clear, using `set_background_image` and `save_provider_config` via Tauri.
- **Chat Settings (L143–155):**
    - "Enter to Send" checkbox.
- **Danger Zone (L157–162):**
    - `AlertDialog` for "Clear All Conversations", resetting messages and session history.
- **Seam:** Appearance, Chat Settings, and Danger Zone could be split into sub-components.

#### D. Models Tab Content (L166–203)
- Iterative rendering of `ProviderSection` for Anthropic, OpenAI, Google Gemini, LM Studio, and Ollama.
- **Seam:** High-priority extraction of the list to a configuration object.

### 4. Sub-Component: ProviderSection (L213–346)
- **Props:** `title`, `icon`, `description`, `storeKey`, `type` (key/url), `placeholder`, `testCommand`, `provider`.
- **State:** `value`, `isSaving`, `isTesting`.
- **Logic:** 
    - `useEffect` (L229–241): Loads initial config on mount.
    - `handleSave` (L243–275): Updates specific provider settings while filtering masked keys.
    - `handleTest` (L277–299): Invokes provider-specific model listing commands.
- **JSX:**
    - Provider Header (L304–313).
    - Input Area (L315–334) with masked input for keys and "Save" button.
    - "Load Models" / "Detect Models" button (L336–343).
- **Seam:** Can be extracted into its own file `src/components/dashboard/ProviderSection.tsx`.

## Logic Blocks (Event Handlers)
- `onThemeChange` (passed via props): Toggles dark mode.
- `set_background_image` (Tauri invoke): Opens file picker for backgrounds.
- `save_provider_config` (Tauri invoke): Persists settings to backend.
- `list_local_models` / `list_*_models` (Tauri invoke): Validates keys/endpoints.

## Key Seams & Decoupling Strategy

1. **`ProviderSection.tsx`**: Isolate the entire provider configuration UI and logic. It is quite large (~130 lines) and highly reusable.
2. **`GeneralSettings.tsx`**: Group Appearance and Chat settings.
3. **`DangerZone.tsx`**: Isolate the destructive "Clear All" logic and its complex `AlertDialog`.
4. **`useSettingsConfig.ts`**: Extract the Tauri `invoke` logic for loading/saving provider configurations.
5. **`providerConfig.ts`**: Move the static list of AI providers (L183–201) into a configuration file.

## Dependencies
- **Zustand:** Not used directly in `SettingsDialog` (props are passed down), though parent components likely use stores.
- **Framer Motion:** Used for tab transitions and entrance animations.
- **Tauri:** Deeply integrated via `invoke` for system-level settings and background image selection.
- **Sonner:** Used for status toasts.
