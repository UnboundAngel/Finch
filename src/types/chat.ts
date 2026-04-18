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
  id?: string;
  role: 'user' | 'ai';
  content: string;
  reasoning?: string;
  metadata?: MessageMetadata;
  branchPoint?: boolean;
  streaming?: boolean;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
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
  passiveLearning?: boolean;
  webSearch?: boolean;
  customBgLight?: string;
  customBgDark?: string;
};
