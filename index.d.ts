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

declare const _default: typeof TabichanClient;
export default _default;