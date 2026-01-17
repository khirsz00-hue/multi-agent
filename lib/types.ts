export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'ollama';

export interface Space {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  space_id: string;
  name: string;
  type: string;
  role?: string;
  description?: string;
  llm_provider: LLMProvider;
  llm_model: string;
  llm_temperature: number;
  llm_max_tokens: number;
  system_instructions?: string;
  reads_from?: string[];
  created_at: string;
  updated_at: string;
}

export interface File {
  id: string;
  agent_id: string;
  name: string;
  storage_path: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
}

export interface FileChunk {
  id: string;
  file_id: string;
  content: string;
  embedding?: number[];
  chunk_index: number;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  agent_id: string;
  user_id: string;
  title?: string;
  created_at: string;
  updated_at: string;
}

// LLM Models configuration
export const LLM_MODELS: Record<LLMProvider, string[]> = {
  openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  google: ['gemini-pro', 'gemini-pro-vision'],
  ollama: ['llama3', 'mistral', 'codellama']
};

export const AGENT_TYPES = [
  'marketing_strategist',
  'content_writer',
  'code_reviewer',
  'data_analyst',
  'customer_support',
  'custom'
] as const;

export type AgentType = typeof AGENT_TYPES[number];

// Quick Content Editor Types
export type QuickContentType = 'engagement_post' | 'thread';

export interface EngagementPostContent {
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  format_suggestion?: string;
  engagement_tips?: string[];
}

export interface ThreadContent {
  tweets: string[];
  hashtags: string[];
  thread_tips?: string[];
}

export interface ContentDraft {
  id: string;
  agent_id: string;
  pain_point_id?: string;
  content_type: QuickContentType | string;
  tone: string;
  goal: string;
  draft: EngagementPostContent | ThreadContent | any;
  status: 'draft' | 'approved' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
