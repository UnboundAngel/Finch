export type WebSearchResearchEvent = {
  type: 'search_start' | 'search_source' | 'search_done';
  data?: any;
};

export type ArtifactKind = 'code' | 'html' | 'markdown' | 'svg' | 'react' | 'text' | 'color-studio';

export type Artifact = {
  id: string;
  kind: ArtifactKind;
  title: string;
  language?: string;
  content: string;
  /** 1-based version index within its message */
  version: number;
  /** Absolute path on disk after the artifact has been persisted. Present after stream completion. */
  filePath?: string;
};

export type MessageMetadata = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  tokensPerSecond?: number;
  timeToFirstToken?: number;
  totalDuration?: number;
  model?: string;
  stopReason?: string;
  timestamp?: Date;
  researchEvents?: WebSearchResearchEvent[];
  artifacts?: Artifact[];
};

export type Message = {
  id?: string;
  role: 'user' | 'ai';
  content: string;
  /** Present when the user sent this turn with a file attachment (Tauri local path). */
  attachment?: { name: string; path: string };
  reasoning?: string;
  metadata?: MessageMetadata;
  branchPoint?: boolean;
  streaming?: boolean;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  /** Finch profile that owns this chat (omitted on older saved files). */
  profileId?: string;
  model?: string;
  provider?: string;
  timestamp: number;
  created_at?: number;
  updated_at?: number;
  type?: string;
  pinned: boolean;
  incognito: boolean;
  systemPrompt: string;
  generationParams: {
    temperature: number;
    maxTokens: number;
    topP: number;
  };
  stats: {
    totalTokens: number;
    totalMessages: number;
    averageSpeed: number;
  };
};

export type Profile = {
  id: string;
  name: string;
  avatarUrl: string;
  email?: string;
  prompt?: string;
  model?: string;
  /** Provider id matching the chat store (e.g. anthropic, openai, local_ollama). */
  provider?: string;
  passiveLearning?: boolean;
  webSearch?: boolean;
  customBgLight?: string;
  customBgDark?: string;
};
