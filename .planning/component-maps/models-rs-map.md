# Component Map: models.rs

Modular breakdown and anatomy of the `models.rs` IPC module to identify extraction points and reduce complexity.

## Component Overview
- **File:** `src-tauri/src/ipc/models.rs`
- **Line Count:** 346 lines
- **Responsibility:** Handles AI model management via Tauri commands, including discovery, status polling, memory-aware context calculations, and lifecycle management (ejection).

## Anatomy

### 1. Imports & External Crates (L1–5)
- **Tauri:** `AppHandle`, `command`.
- **Internal:** `ProviderConfig`, `ContextIntelligence`.
- **Standard/External:** `std::env`, `tauri_plugin_store::StoreExt`, `sysinfo::System`, `reqwest::Client`.

### 2. Public Commands (IPC)

#### A. Discovery Commands
- **`list_local_models` (L7–45):**
    - Fetches models from Ollama (`/api/tags`) and LM Studio (`/v1/models`).
    - Uses `reqwest` for HTTP requests.
- **`list_anthropic_models` (L47–83):**
    - Fetches models from Anthropic API.
    - Handles API key retrieval from store or environment variables.
- **`list_openai_models` (L85–123):**
    - Fetches models from OpenAI API.
    - Filters for `owned_by: "openai"` and specific prefixes (`gpt-`, `o`).
- **`list_gemini_models` (L125–158):**
    - Fetches models from Google Gemini API.
    - Strips `models/` prefix and filters for `gemini-` prefix.

#### B. Lifecycle & Status Commands
- **`eject_model` (L160–198):**
    - Unloads local models to free system resources.
    - LM Studio: POST to `/api/v1/models/unload`.
    - Ollama: POST to `/api/generate` with `keep_alive: 0`.
- **`get_model_loaded_status` (L200–267):**
    - Checks if a model is currently active in memory.
    - Ollama: GET `/api/ps`.
    - LM Studio: GET `/api/v0/models` (checks `state == "loaded"`).

#### C. Intelligence Commands
- **`get_context_intelligence` (L269–384):**
    - **Hardware Awareness:** Uses `sysinfo` to get total system memory.
    - **Logic:** Calculates `hardware_safe_limit` by estimating model weight vs available RAM.
    - **Provider Specifics:**
        - Ollama: POST `/api/show` to get `num_ctx` and parameter size.
        - LM Studio: GET `/api/v0/models/{id}` for `max_context_length`.

### 3. Logic Blocks & Helpers
- **Store Access:** Repeated use of `handle.store("finch_config.json")` to retrieve `provider_config`.
- **API Key Masking:** Logic to ignore `"••••••••"` and fall back to environment variables.
- **Memory Calculation (L318–333):** Heuristic for estimating RAM usage based on parameter billions and quantization factors.

## Seams & Decoupling Strategy

1. **`Provider Clients`**: The logic for Ollama, LM Studio, Anthropic, etc., is currently mixed within the commands. These could be extracted into a `providers/` directory with dedicated modules (e.g., `ollama.rs`, `openai.rs`).
2. **`Config Helper`**: Centralize the boilerplate for `AppHandle` -> `Store` -> `ProviderConfig` retrieval and API key masking.
3. **`Hardware Profiler`**: Move the `sysinfo` logic and memory heuristic (L279–285, L318–333) into a dedicated `system.rs` or `memory.rs` helper.
4. **`Constants/Types`**: Move string literals like `"local_ollama"`, `"local_lmstudio"`, and endpoint paths into a shared configuration or constants file.

## Dependencies
- **reqwest:** Heavy async HTTP usage for all provider communication.
- **serde_json:** Parsing JSON responses from local and cloud providers.
- **sysinfo:** Used exclusively in `get_context_intelligence`.
- **tauri-plugin-store:** For persisting and retrieving API keys/endpoints.
