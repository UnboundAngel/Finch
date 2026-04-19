import { invoke } from '@tauri-apps/api/core';

export type ProviderId =
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'local_ollama'
  | 'local_lmstudio';

export type ModelsMap = Record<ProviderId, string[]>;

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  local_ollama: 'Ollama',
  local_lmstudio: 'LM Studio',
};

const EMPTY: ModelsMap = {
  anthropic: [],
  openai: [],
  gemini: [],
  local_ollama: [],
  local_lmstudio: [],
};

/** Loads discoverable models the same way the in-app model picker does. */
export async function fetchModelsMap(): Promise<ModelsMap> {
  try {
    const config: Record<string, unknown> | null =
      (await invoke('get_provider_config')) ?? null;
    if (!config) return { ...EMPTY };

    const [anthropic, openai, gemini] = await Promise.all([
      invoke<string[]>('list_anthropic_models').catch(() => []),
      invoke<string[]>('list_openai_models').catch(() => []),
      invoke<string[]>('list_gemini_models').catch(() => []),
    ]);

    let local_ollama: string[] = [];
    if (config.ollama_endpoint) {
      try {
        local_ollama = await invoke<string[]>('list_local_models', {
          endpoint: config.ollama_endpoint,
          provider: 'local_ollama',
        });
      } catch {
        /* ignore */
      }
    }

    let local_lmstudio: string[] = [];
    if (config.lmstudio_endpoint) {
      try {
        local_lmstudio = await invoke<string[]>('list_local_models', {
          endpoint: config.lmstudio_endpoint,
          provider: 'local_lmstudio',
        });
      } catch {
        /* ignore */
      }
    }

    return {
      anthropic: anthropic || [],
      openai: openai || [],
      gemini: gemini || [],
      local_ollama: local_ollama || [],
      local_lmstudio: local_lmstudio || [],
    };
  } catch {
    return { ...EMPTY };
  }
}

export function firstUsableModel(
  models: ModelsMap
): { provider: ProviderId; model: string } | null {
  const order: ProviderId[] = [
    'anthropic',
    'openai',
    'gemini',
    'local_ollama',
    'local_lmstudio',
  ];
  for (const p of order) {
    const list = models[p];
    if (list.length > 0) return { provider: p, model: list[0] };
  }
  return null;
}

export function inferProviderForModel(
  modelId: string | undefined,
  models: ModelsMap
): ProviderId | null {
  if (!modelId) return null;
  for (const p of Object.keys(models) as ProviderId[]) {
    if (models[p].includes(modelId)) return p;
  }
  return null;
}
