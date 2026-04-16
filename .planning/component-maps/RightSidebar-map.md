---
title: RightSidebar.tsx — Component Map
date: Thursday, April 16, 2026
tags:
  - finch
  - component-map
  - sidebar
file: src/components/sidebar/RightSidebar.tsx
loc: 505
status: mapped
---

### 1. Imports
**React & Hooks**
- `React`, `{ useRef, useEffect }` from `'react'`

**Third-party Libs**
- `{ motion, AnimatePresence }` from `'framer-motion'`
- `{ HelpCircle, X, Loader2, Trash2, ChevronDown, Terminal, Sliders, FileJson, Hash }` from `'lucide-react'`

**Internal Store / Slice Imports**
- `{ useModelParams, useChatStore }` from `'@/src/store'`

**Internal Component Imports**
- `{ Label }` from `'@/components/ui/label'`
- `{ Tooltip, TooltipContent, TooltipTrigger, TooltipProvider }` from `'@/components/ui/tooltip'`
- `{ ScrollArea }` from `'@/components/ui/scroll-area'`
- `{ MaxTokensSlider }` from `'./MaxTokensSlider'`

**Types & Utils**
- `{ cn }` from `'@/lib/utils'`

### 2. Constants & config
- `ParameterZone`: A local functional component used to wrap collapsible sections within the sidebar.
- `circleBorderClass`: A dynamic string computed inside the component for theme-aware slider thumb styling.
- `textColor`, `mutedTextColor`, `inputBg`, `borderColor`, `iconColor`: Theme-aware CSS classes derived from the `contrast` prop.

### 3. Props interface
| Name | Type | Optional | Purpose |
| :--- | :--- | :--- | :--- |
| `isOpen` | `boolean` | No | Controls visibility and entry/exit animation state. |
| `readyToFetch` | `boolean` | Yes | Guard flag to prevent store fetches until entrance animations finish. |
| `isPinkMode` | `boolean` | Yes | Enables "Susie" (pink/green) theme styling. |
| `contrast` | `'light' \| 'dark'` | Yes | Determines high-level color palette for text and borders. |

### 4. Internal state
| Hook | Name | Description |
| :--- | :--- | :--- |
| `useState` | `localMaxTokens` | Buffers the max tokens input value before blurring/syncing to store. |
| `useState` | `tempInput` | Buffers the temperature text input value. |
| `useState` | `pInput` | Buffers the Top P text input value. |
| `useState` | `themeMode` | Tracks the current HTML class for zero-flash gradient updates. |
| `useState` | `isPromptOpen` | Tracks the toggle state of the Prompt section. |
| `useState` | `isSamplingOpen` | Tracks the toggle state of the Sampling section. |
| `useState` | `isOutputOpen` | Tracks the toggle state of the Output section. |
| `useRef` | `stopInputRef` | Reference to the stop word text input. |
| `useRef` | `textareaRef` | Reference to the system prompt textarea for auto-resizing. |
| `useEffect` | - | Syncs `localMaxTokens` when store `maxTokens` changes. |
| `useEffect` | - | MutationObserver to sync `themeMode` with document class. |
| `useEffect` | - | Syncs `tempInput` when store `temperature` changes. |
| `useEffect` | - | Syncs `pInput` when store `topP` changes. |
| `useEffect` | - | Auto-resizes the system prompt textarea. |
| `useEffect` | - | Triggers `fetchContextIntelligence` when props/dependencies align. |
| `useCallback` | `getTemperatureGradient` | Generates the multi-stop linear gradient for the temperature slider. |
| `useCallback` | `getTopPGradient` | Generates the multi-stop linear gradient for the Top P slider. |

### 5. Zustand / external state
**useModelParams**
- `systemPrompt`: The current system instruction string.
- `temperature`: Floating point creativity setting (0-2).
- `topP`: Nucleus sampling probability (0-1).
- `maxTokens`: Current response limit.
- `stopStrings`: Array of strings that trigger generation halt.
- `contextIntelligenceStatus`: 'loading' | 'idle' etc.
- `contextIntelligence`: Model-specific limits and data.
- `setSystemPrompt`, `setTemperature`, `setTopP`, `setMaxTokens`: Value setters.
- `addStopString`, `removeStopString`: Stop word list modifiers.
- `fetchContextIntelligence`: Remote action to get model capabilities.

**useChatStore**
- `selectedModel`: The active model ID.
- `selectedProvider`: The active provider ID (OpenAI, Local, etc).

### 6. Sections of JSX (the render map)

#### Root Sidebar Container
- **Lines:** 187 - 195
- **Renders:** An `<aside>` with transition classes for opacity and fixed width.
- **Components:** `aside`

#### Tooltip & Scroll Provider
- **Lines:** 196 - 198
- **Renders:** Wrapping providers for accessibility and layout overflow.
- **Components:** `TooltipProvider`, `ScrollArea`

#### Header Section
- **Lines:** 200 - 206
- **Renders:** The "Parameters" title and a brief description.
- **Components:** `h2`, `p`

#### Prompt Zone
- **Lines:** 209 - 245
- **Renders:** The system prompt text area and token count display.
- **Components:** `ParameterZone`, `Label`, `Tooltip`, `textarea`
> [!info]
> Renders the current token count derived from prompt length.

#### Sampling Zone
- **Lines:** 248 - 364
- **Renders:** Temperature and Top P sliders with reset buttons and numeric inputs.
- **Components:** `ParameterZone`, `Label`, `Tooltip`, `input[type="range"]`, `input[type="text"]`, `AnimatePresence`
> [!info]
> Contains dynamic warnings that appear via Framer Motion when values reach extreme ranges.
> [!warning]
> Temperature and Top P gradients contain complex inline logic mapping colors to slider percentages.

#### Output Zone
- **Lines:** 367 - 404
- **Renders:** Max tokens input and the dedicated slider component.
- **Components:** `ParameterZone`, `Label`, `Tooltip`, `input[type="number"]`, `MaxTokensSlider`
> [!info]
> Shows a `Loader2` spinner when context intelligence is being fetched.

#### Stop Words Zone
- **Lines:** 407 - 453
- **Renders:** Tag-style stop word list and input field.
- **Components:** `ParameterZone`, `input[type="text"]`, `AnimatePresence`, `motion.span`
> [!info]
> Renders the `</think>` tag with a ghost/dashed style if present.

### 7. Event handlers & functions
- `handleMaxTokensBlur`: Validates and clamps the max tokens input before updating the store.
- `handleAddStop`: Handler for 'Enter' key on stop word input; adds to list.
- `getTemperatureWarning`: Pure function returning a warning string based on value thresholds.
- `getTopPWarning`: Pure function returning a warning string based on value thresholds.
- `onToggle`: Passed to `ParameterZone` to control section collapse states.

### 8. Summary callout
> [!abstract] Summary
> - **Total responsibilities:**
>   - AI Parameter configuration (Prompt, Sampling, Limits)
>   - Visual validation/warning feedback for LLM settings
>   - Synchronization of model-specific intelligence (limits)
>   - Management of stop-sequence tokens
> - **Total child components:** `ParameterZone`, `MaxTokensSlider`, `Label`, `Tooltip`, `ScrollArea`, `Lucide Icons`.
> - **Obvious seams:**
>   - `PromptSection`: The System Prompt logic (resizing, token counting) is self-contained.
>   - `SamplingSection`: Creativity and Focus controls share complex gradient/warning logic.
>   - `StopWordsSection`: The tag management logic could easily be decoupled.
