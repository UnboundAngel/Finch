/** Returns true for providers that run models locally via LM Studio or Ollama. */
export function isLocalInferenceProvider(provider: string): boolean {
  return provider === 'local_lmstudio' || provider === 'local_ollama';
}
