export type Country = 'japan' | 'france';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface PollChatResponse {
  status: 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}