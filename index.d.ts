export type Country = 'japan' | 'france';

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

export declare class TabichanClient {
  constructor(apiKey?: string);
  
  setApiKey(apiKey: string): void;
  setBaseURL(baseURL: string): void;
  
  startChat(
    userQuery: string,
    userId: string,
    country?: Country,
    history?: ChatMessage[],
    additionalInputs?: Record<string, any>
  ): Promise<string>;
  
  pollChat(taskId: string): Promise<PollChatResponse>;
  
  waitForChat(taskId: string, verbose?: boolean): Promise<any>;
  
  getImage(id: string, country?: Country): Promise<string>;
}

export declare class TabichanWebSocket {
  constructor(userId: string, apiKey?: string);
  
  readonly userId: string;
  readonly apiKey: string;
  readonly isConnected: boolean;
  readonly currentQuestionId: string | null;
  
  connect(): Promise<void>;
  disconnect(): void;
  
  startChat(
    query: string,
    history?: ChatMessage[],
    preferences?: Record<string, any>
  ): Promise<void>;
  
  sendResponse(response: string): Promise<void>;
  
  getConnectionState(): WebSocketConnectionState['state'];
  hasActiveQuestion(): boolean;
  setBaseURL(baseURL: string): void;
  
  // Event emitter methods
  on(event: 'connected', listener: () => void): this;
  on(event: 'disconnected', listener: (info: { code: number; reason: string }) => void): this;
  on(event: 'message', listener: (message: WebSocketMessage) => void): this;
  on(event: 'question', listener: (data: { question_id: string; question: string }) => void): this;
  on(event: 'result', listener: (data: { result: any }) => void): this;
  on(event: 'complete', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'authError', listener: (error: Error) => void): this;
  on(event: 'chatError', listener: (error: Error) => void): this;
  on(event: 'unknownMessage', listener: (message: WebSocketMessage) => void): this;
  
  emit(event: string | symbol, ...args: any[]): boolean;
  removeListener(event: string | symbol, listener: (...args: any[]) => void): this;
  off(event: string | symbol, listener: (...args: any[]) => void): this;
}

declare const _default: typeof TabichanClient;
export default _default;
export { TabichanWebSocket };