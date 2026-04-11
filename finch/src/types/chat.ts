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
};

export type Message = {
  role: 'user' | 'ai';
  content: string;
  reasoning?: string;
  metadata?: MessageMetadata;
  branchPoint?: boolean;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
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
