const TabichanWebSocket = require('../src/websocket');
const WebSocket = require('ws');

// Mock the WebSocket module
jest.mock('ws');

describe('TabichanWebSocket', () => {
  let client;
  let mockWebSocket;
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env;
    process.env = { ...originalEnv };
    
    // Create mock WebSocket instance
    mockWebSocket = {
      readyState: WebSocket.CONNECTING,
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      terminate: jest.fn()
    };

    // Mock WebSocket constructor
    WebSocket.mockImplementation(() => mockWebSocket);
    
    // Mock WebSocket constants
    WebSocket.CONNECTING = 0;
    WebSocket.OPEN = 1;
    WebSocket.CLOSING = 2;
    WebSocket.CLOSED = 3;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.clearAllMocks();
    
    if (client) {
      client.disconnect();
      client.removeAllListeners();
    }
  });

  describe('Constructor', () => {
    test('should initialize with userId and API key', () => {
      client = new TabichanWebSocket('user123', 'test-api-key');
      
      expect(client.userId).toBe('user123');
      expect(client.apiKey).toBe('test-api-key');
      expect(client.isConnected).toBe(false);
      expect(client.currentQuestionId).toBe(null);
    });

    test('should use environment variable for API key', () => {
      process.env.TABICHAN_API_KEY = 'env-api-key';
      client = new TabichanWebSocket('user123');
      
      expect(client.apiKey).toBe('env-api-key');
    });

    test('should throw error when userId is missing', () => {
      expect(() => {
        new TabichanWebSocket();
      }).toThrow('userId is required');
    });

    test('should throw error when API key is missing', () => {
      delete process.env.TABICHAN_API_KEY;
      
      expect(() => {
        new TabichanWebSocket('user123');
      }).toThrow('API key is not set. Please set the TABICHAN_API_KEY environment variable or pass it as an argument.');
    });
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      client = new TabichanWebSocket('user123', 'test-api-key');
    });

    test('should connect successfully', async () => {
      const connectPromise = client.connect();
      
      // Simulate successful connection
      const openCallback = mockWebSocket.on.mock.calls.find(call => call[0] === 'open')[1];
      mockWebSocket.readyState = WebSocket.OPEN;
      openCallback();
      
      await connectPromise;
      
      expect(client.isConnected).toBe(true);
      expect(WebSocket).toHaveBeenCalledWith('wss://tabichan.podtech-ai.com/v1/ws/chat/user123?api_key=test-api-key');
    });

    test('should handle connection error', async () => {
      const errorHandler = jest.fn();
      client.on('error', errorHandler);
      
      const connectPromise = client.connect();
      
      // Simulate connection error
      const errorCallback = mockWebSocket.on.mock.calls.find(call => call[0] === 'error')[1];
      const error = new Error('Connection failed');
      errorCallback(error);
      
      await expect(connectPromise).rejects.toThrow('Connection failed');
      expect(errorHandler).toHaveBeenCalledWith(error);
    });

    test('should handle authentication error', async () => {
      const authErrorHandler = jest.fn();
      client.on('authError', authErrorHandler);
      
      client.connect();
      
      // Simulate authentication error (close with code 1008)
      const closeCallback = mockWebSocket.on.mock.calls.find(call => call[0] === 'close')[1];
      closeCallback(1008, 'Unauthorized');
      
      expect(authErrorHandler).toHaveBeenCalledWith(expect.any(Error));
      expect(authErrorHandler.mock.calls[0][0].message).toContain('Authentication failed');
    });

    test('should handle normal disconnection', async () => {
      const disconnectedHandler = jest.fn();
      client.on('disconnected', disconnectedHandler);
      
      client.connect();
      
      // Simulate normal disconnection
      const closeCallback = mockWebSocket.on.mock.calls.find(call => call[0] === 'close')[1];
      closeCallback(1000, 'Normal closure');
      
      expect(disconnectedHandler).toHaveBeenCalledWith({ code: 1000, reason: 'Normal closure' });
      expect(client.isConnected).toBe(false);
    });

    test('should handle connection timeout', async () => {
      jest.useFakeTimers();
      
      const connectPromise = client.connect();
      
      // Fast forward past the 10 second timeout
      jest.advanceTimersByTime(10000);
      
      await expect(connectPromise).rejects.toThrow('Connection timeout');
      expect(mockWebSocket.terminate).toHaveBeenCalled();
      
      // Clean up
      client.disconnect();
      jest.useRealTimers();
    });

    test('should reuse existing connection promise', () => {
      const promise1 = client.connect();
      const promise2 = client.connect();
      
      expect(promise1).toBe(promise2);
      
      // Clean up
      client.disconnect();
    });

    test('should disconnect properly', () => {
      client.ws = mockWebSocket;
      client.isConnected = true;
      client.currentQuestionId = 'test-question';
      
      client.disconnect();
      
      expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Client disconnecting');
      expect(client.isConnected).toBe(false);
      expect(client.currentQuestionId).toBe(null);
      expect(client.ws).toBe(null);
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      client = new TabichanWebSocket('user123', 'test-api-key');
      client.ws = mockWebSocket;
      client.isConnected = true;
      mockWebSocket.readyState = WebSocket.OPEN;
    });

    test('should handle question message', () => {
      const questionHandler = jest.fn();
      client.on('question', questionHandler);
      
      const message = {
        type: 'question',
        data: {
          question_id: 'q123',
          question: 'What is your preference?'
        }
      };
      
      client.handleMessage(message);
      
      expect(client.currentQuestionId).toBe('q123');
      expect(questionHandler).toHaveBeenCalledWith(message.data);
    });

    test('should handle result message', () => {
      const resultHandler = jest.fn();
      client.on('result', resultHandler);
      
      const message = {
        type: 'result',
        data: {
          result: { answer: 'Here are some recommendations' }
        }
      };
      
      client.handleMessage(message);
      
      expect(resultHandler).toHaveBeenCalledWith(message.data);
    });

    test('should handle error message', () => {
      const errorHandler = jest.fn();
      client.on('chatError', errorHandler);
      
      const message = {
        type: 'error',
        data: 'Something went wrong'
      };
      
      client.handleMessage(message);
      
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
      expect(errorHandler.mock.calls[0][0].message).toBe('Something went wrong');
    });

    test('should handle complete message', () => {
      const completeHandler = jest.fn();
      client.on('complete', completeHandler);
      client.currentQuestionId = 'q123';
      
      const message = { type: 'complete' };
      
      client.handleMessage(message);
      
      expect(client.currentQuestionId).toBe(null);
      expect(completeHandler).toHaveBeenCalled();
    });

    test('should handle unknown message types', () => {
      const unknownHandler = jest.fn();
      client.on('unknownMessage', unknownHandler);
      
      const message = { type: 'unknown', data: 'test' };
      
      client.handleMessage(message);
      
      expect(unknownHandler).toHaveBeenCalledWith(message);
    });

    test('should handle malformed JSON messages', () => {
      const errorHandler = jest.fn();
      client.on('error', errorHandler);
      
      client.connect();
      
      // Simulate receiving malformed JSON
      const messageCallback = mockWebSocket.on.mock.calls.find(call => call[0] === 'message')[1];
      messageCallback({ toString: () => 'invalid json' });
      
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
      expect(errorHandler.mock.calls[0][0].message).toContain('Failed to parse message');
    });
  });

  describe('Chat Operations', () => {
    beforeEach(() => {
      client = new TabichanWebSocket('user123', 'test-api-key');
      client.ws = mockWebSocket;
      client.isConnected = true;
      mockWebSocket.readyState = WebSocket.OPEN;
    });

    test('should start chat successfully', async () => {
      const query = 'Show me places in Tokyo';
      const history = [{ role: 'user', content: 'Hello' }];
      const preferences = { budget: 'medium' };
      
      await client.startChat(query, history, preferences);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'chat_request',
        query,
        history,
        preferences
      }));
    });

    test('should start chat with default parameters', async () => {
      const query = 'Show me places in Tokyo';
      
      await client.startChat(query);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'chat_request',
        query,
        history: [],
        preferences: {}
      }));
    });

    test('should throw error when starting chat while disconnected', async () => {
      client.isConnected = false;
      
      await expect(client.startChat('test query')).rejects.toThrow('WebSocket is not connected. Call connect() first.');
    });

    test('should send response successfully', async () => {
      client.currentQuestionId = 'q123';
      const response = 'I prefer cultural sites';
      
      await client.sendResponse(response);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'response',
        question_id: 'q123',
        response
      }));
      expect(client.currentQuestionId).toBe(null);
    });

    test('should throw error when sending response while disconnected', async () => {
      client.isConnected = false;
      client.currentQuestionId = 'q123';
      
      await expect(client.sendResponse('test')).rejects.toThrow('WebSocket is not connected');
    });

    test('should throw error when sending response without active question', async () => {
      client.currentQuestionId = null;
      
      await expect(client.sendResponse('test')).rejects.toThrow('No active question to respond to');
    });

    test('should handle WebSocket send error', async () => {
      mockWebSocket.send.mockImplementation(() => {
        throw new Error('Send failed');
      });
      
      await expect(client.startChat('test')).rejects.toThrow('Send failed');
    });

    test('should handle WebSocket not open', async () => {
      mockWebSocket.readyState = WebSocket.CLOSED;
      
      await expect(client.startChat('test')).rejects.toThrow('WebSocket is not open');
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      client = new TabichanWebSocket('user123', 'test-api-key');
    });

    test('should return correct connection state', () => {
      // No WebSocket
      expect(client.getConnectionState()).toBe('disconnected');
      
      // WebSocket in different states
      client.ws = mockWebSocket;
      
      mockWebSocket.readyState = WebSocket.CONNECTING;
      expect(client.getConnectionState()).toBe('connecting');
      
      mockWebSocket.readyState = WebSocket.OPEN;
      expect(client.getConnectionState()).toBe('connected');
      
      mockWebSocket.readyState = WebSocket.CLOSING;
      expect(client.getConnectionState()).toBe('closing');
      
      mockWebSocket.readyState = WebSocket.CLOSED;
      expect(client.getConnectionState()).toBe('closed');
      
      mockWebSocket.readyState = 999; // Unknown state
      expect(client.getConnectionState()).toBe('unknown');
    });

    test('should check if has active question', () => {
      expect(client.hasActiveQuestion()).toBe(false);
      
      client.currentQuestionId = 'q123';
      expect(client.hasActiveQuestion()).toBe(true);
    });

    test('should set base URL when disconnected', () => {
      const newBaseURL = 'wss://custom.example.com/v1';
      client.setBaseURL(newBaseURL);
      
      expect(client.baseURL).toBe(newBaseURL);
    });

    test('should throw error when setting base URL while connected', () => {
      client.isConnected = true;
      
      expect(() => {
        client.setBaseURL('wss://new.example.com');
      }).toThrow('Cannot change base URL while connected');
    });
  });

  describe('Event Emitter Functionality', () => {
    beforeEach(() => {
      client = new TabichanWebSocket('user123', 'test-api-key');
    });

    test('should emit and listen to custom events', () => {
      const testHandler = jest.fn();
      client.on('test-event', testHandler);
      
      client.emit('test-event', 'test-data');
      
      expect(testHandler).toHaveBeenCalledWith('test-data');
    });

    test('should remove event listeners', () => {
      const testHandler = jest.fn();
      client.on('test-event', testHandler);
      
      client.removeListener('test-event', testHandler);
      client.emit('test-event', 'test-data');
      
      expect(testHandler).not.toHaveBeenCalled();
    });
  });
});