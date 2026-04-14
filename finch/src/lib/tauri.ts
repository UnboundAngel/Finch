import { invoke } from "@tauri-apps/api/core";

/**
 * Checks if the application is running in a Tauri context.
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__ !== undefined;
}

/**
 * A type-safe wrapper for the Rust 'greet' command.
 */
export async function greet(name: string): Promise<string> {
  if (!isTauri()) {
    console.warn("greet called outside of Tauri context. Returning mock greeting.");
    return `Mock: Hello, ${name}! You're in a browser.`;
  }
  return await invoke<string>("greet", { name });
}

/**
 * Sends a message to the Rust backend to communicate with the Anthropic API.
 */
export async function sendMessage(
  prompt: string, 
  model: string = "Finch 3.5 Sonnet",
  systemPrompt?: string,
  temperature?: number,
  topP?: number,
  maxTokens?: number,
  stopStrings?: string[]
): Promise<string> {
  if (!isTauri()) {
    console.warn("sendMessage called outside of Tauri context. Returning mock response.");
    return `Mock: Rust received: ${prompt} using model ${model}`;
  }
  return await invoke<string>("send_message", { 
    prompt, 
    model,
    systemPrompt,
    temperature,
    topP,
    maxTokens,
    stopStrings
  });
}
