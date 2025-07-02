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

// WebSocket types
export interface WebSocketMessage {
  type: string;
  data?: any;
}

export interface WebSocketQuestionMessage {
  type: 'question';
  data: {
    question_id: string;
    question: string;
  };
}

export interface WebSocketResultMessage {
  type: 'result';
  data: {
    result: any;
  };
}

export interface WebSocketErrorMessage {
  type: 'error';
  data: string;
}

export interface WebSocketCompleteMessage {
  type: 'complete';
}

export interface ChatRequest {
  type: 'chat_request';
  query: string;
  history: ChatMessage[];
  preferences: Record<string, any>;
}

export interface ResponseMessage {
  type: 'response';
  question_id: string;
  response: string;
}

export interface WebSocketConnectionState {
  state: 'disconnected' | 'connecting' | 'connected' | 'closing' | 'closed' | 'unknown';
  hasActiveQuestion: boolean;
  currentQuestionId?: string;
}