const TabichanClient = require('../src/client');

// Mock the http and https modules
jest.mock('https');
jest.mock('http');

const https = require('https');
const http = require('http');

describe('TabichanClient', () => {
  let mockRequest;
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env;
    
    // Create a clean environment for each test
    process.env = { ...originalEnv };
    
    // Mock request object
    mockRequest = {
      on: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      destroy: jest.fn()
    };
    
    https.request = jest.fn(() => mockRequest);
    http.request = jest.fn(() => mockRequest);
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('Client Initialization', () => {
    test('should initialize with direct API key', () => {
      const apiKey = 'test-api-key';
      const client = new TabichanClient(apiKey);
      
      expect(client.apiKey).toBe(apiKey);
      expect(client.baseURL).toBe('https://tourism-api.podtech-ai.com/v1');
      expect(client.alternativeBaseURL).toBe('https://tabichan.podtech-ai.com/v1');
      expect(client.defaultHeaders['x-api-key']).toBe(apiKey);
    });

    test('should initialize with API key from environment variable', () => {
      process.env.TABICHAN_API_KEY = 'env-api-key';
      const client = new TabichanClient();
      
      expect(client.apiKey).toBe('env-api-key');
      expect(client.defaultHeaders['x-api-key']).toBe('env-api-key');
    });

    test('should throw error when API key is missing', () => {
      delete process.env.TABICHAN_API_KEY;
      
      expect(() => {
        new TabichanClient();
      }).toThrow('API key is not set. Please set the TABICHAN_API_KEY environment variable or pass it as an argument to the TabichanClient constructor.');
    });
  });

  describe('API Methods', () => {
    let client;
    let mockResponse;

    beforeEach(() => {
      process.env.TABICHAN_API_KEY = 'test-key';
      client = new TabichanClient();
      
      mockResponse = {
        statusCode: 200,
        statusMessage: 'OK',
        headers: { 'content-type': 'application/json' },
        on: jest.fn()
      };
    });

    const mockSuccessfulRequest = (responseData) => {
      https.request.mockImplementation((options, callback) => {
        setTimeout(() => {
          callback(mockResponse);
          
          // Simulate data and end events
          const dataCallback = mockResponse.on.mock.calls.find(call => call[0] === 'data')[1];
          const endCallback = mockResponse.on.mock.calls.find(call => call[0] === 'end')[1];
          
          dataCallback(JSON.stringify(responseData));
          endCallback();
        }, 0);
        
        return mockRequest;
      });
    };

    test('should start chat successfully', async () => {
      const responseData = { task_id: 'test-task-id' };
      mockSuccessfulRequest(responseData);

      const taskId = await client.startChat('Test query', 'user123');

      expect(taskId).toBe('test-task-id');
      expect(https.request).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: 'tourism-api.podtech-ai.com',
          path: '/chat',
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-key'
          })
        }),
        expect.any(Function)
      );
    });

    test('should start chat with all parameters', async () => {
      const responseData = { task_id: 'france-task-id' };
      mockSuccessfulRequest(responseData);

      const history = [{ role: 'user', content: 'Previous message' }];
      const additionalInputs = { preference: 'luxury' };

      const taskId = await client.startChat(
        'France query',
        'user456',
        'france',
        history,
        additionalInputs
      );

      expect(taskId).toBe('france-task-id');
      expect(mockRequest.write).toHaveBeenCalledWith(
        JSON.stringify({
          user_query: 'France query',
          user_id: 'user456',
          country: 'france',
          history: history,
          additional_inputs: additionalInputs
        })
      );
    });

    test('should poll chat successfully', async () => {
      const responseData = { 
        status: 'completed', 
        result: { answer: 'Test response' } 
      };
      mockSuccessfulRequest(responseData);

      const result = await client.pollChat('test-task');

      expect(result.status).toBe('completed');
      expect(result.result.answer).toBe('Test response');
      expect(https.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/chat/poll?task_id=test-task',
          method: 'GET'
        }),
        expect.any(Function)
      );
    });

    test('should get image successfully', async () => {
      const responseData = { base64: 'test-base64-data' };
      mockSuccessfulRequest(responseData);

      const imageData = await client.getImage('test-id');

      expect(imageData).toBe('test-base64-data');
      expect(https.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/image?id=test-id&country=japan',
          method: 'GET'
        }),
        expect.any(Function)
      );
    });

    test('should get image with france country', async () => {
      const responseData = { base64: 'france-image-data' };
      mockSuccessfulRequest(responseData);

      const imageData = await client.getImage('fr-image', 'france');

      expect(imageData).toBe('france-image-data');
      expect(https.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/image?id=fr-image&country=france',
          method: 'GET'
        }),
        expect.any(Function)
      );
    });
  });

  describe('waitForChat Method', () => {
    let client;

    beforeEach(() => {
      process.env.TABICHAN_API_KEY = 'test-key';
      client = new TabichanClient();
      
      // Mock pollChat method directly for easier testing
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      console.log.mockRestore();
    });

    test('should return result when chat completes immediately', async () => {
      client.pollChat = jest.fn().mockResolvedValue({
        status: 'completed',
        result: { answer: 'Immediate response' }
      });

      const result = await client.waitForChat('immediate-task');

      expect(result.answer).toBe('Immediate response');
      expect(client.pollChat).toHaveBeenCalledWith('immediate-task');
    });

    test('should wait and return result after running status', async () => {
      let callCount = 0;
      client.pollChat = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ status: 'running' });
        } else {
          return Promise.resolve({ 
            status: 'completed', 
            result: { answer: 'Final answer' } 
          });
        }
      });

      // Mock setTimeout to execute immediately
      jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
        fn();
        return 123;
      });

      const result = await client.waitForChat('running-task');

      expect(result.answer).toBe('Final answer');
      expect(client.pollChat).toHaveBeenCalledTimes(2);
      
      global.setTimeout.mockRestore();
    });

    test('should throw error on failed status', async () => {
      client.pollChat = jest.fn().mockResolvedValue({
        status: 'failed',
        error: 'Test error message'
      });

      await expect(client.waitForChat('failed-task')).rejects.toThrow('Generation failed: Test error message');
    });

    test('should throw error on failed status without error message', async () => {
      client.pollChat = jest.fn().mockResolvedValue({
        status: 'failed'
      });

      await expect(client.waitForChat('failed-task-no-error')).rejects.toThrow('Generation failed: Unknown error');
    });

    test('should throw error on unexpected status', async () => {
      client.pollChat = jest.fn().mockResolvedValue({
        status: 'unknown_status'
      });

      await expect(client.waitForChat('unexpected-task')).rejects.toThrow('Unexpected status: unknown_status');
    });

    test('should throw timeout error after max attempts', async () => {
      client.pollChat = jest.fn().mockResolvedValue({
        status: 'running'
      });

      // Mock setTimeout to execute immediately
      jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
        fn();
        return 123;
      });

      await expect(client.waitForChat('timeout-task')).rejects.toThrow('Timeout: Generation took too long');
      expect(client.pollChat).toHaveBeenCalledTimes(30); // max attempts
      
      global.setTimeout.mockRestore();
    });

    test('should log verbose messages when verbose is true', async () => {
      let callCount = 0;
      client.pollChat = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ status: 'running' });
        } else {
          return Promise.resolve({ 
            status: 'completed', 
            result: { answer: 'Verbose answer' } 
          });
        }
      });

      // Mock setTimeout to execute immediately
      jest.spyOn(global, 'setTimeout').mockImplementation((fn) => {
        fn();
        return 123;
      });

      const result = await client.waitForChat('verbose-task', true);

      expect(result.answer).toBe('Verbose answer');
      expect(console.log).toHaveBeenCalledWith('⏳ Generation still running... (attempt 1/30)');
      expect(console.log).toHaveBeenCalledWith('✅ Generation complete!');
      
      global.setTimeout.mockRestore();
    });
  });

  describe('Error Handling', () => {
    let client;

    beforeEach(() => {
      process.env.TABICHAN_API_KEY = 'test-key';
      client = new TabichanClient();
    });

    test('should handle HTTP errors', async () => {
      const mockResponse = {
        statusCode: 404,
        statusMessage: 'Not Found',
        headers: {},
        on: jest.fn()
      };

      https.request.mockImplementation((options, callback) => {
        setTimeout(() => {
          callback(mockResponse);
          
          const dataCallback = mockResponse.on.mock.calls.find(call => call[0] === 'data')[1];
          const endCallback = mockResponse.on.mock.calls.find(call => call[0] === 'end')[1];
          
          dataCallback('{"error": "Not found"}');
          endCallback();
        }, 0);
        
        return mockRequest;
      });

      await expect(client.startChat('Test', 'user')).rejects.toThrow('HTTP 404: Not Found');
    });

    test('should handle request errors', async () => {
      https.request.mockImplementation(() => {
        setTimeout(() => {
          const errorCallback = mockRequest.on.mock.calls.find(call => call[0] === 'error')[1];
          errorCallback(new Error('Connection failed'));
        }, 0);
        
        return mockRequest;
      });

      await expect(client.startChat('Test', 'user')).rejects.toThrow('Request failed: Connection failed');
    });

    test('should handle timeout errors', async () => {
      https.request.mockImplementation(() => {
        setTimeout(() => {
          const timeoutCallback = mockRequest.on.mock.calls.find(call => call[0] === 'timeout')[1];
          timeoutCallback();
        }, 0);
        
        return mockRequest;
      });

      await expect(client.startChat('Test', 'user')).rejects.toThrow('Request timeout');
    });
  });

  describe('Utility Methods', () => {
    test('should update API key', () => {
      const client = new TabichanClient('initial-key');
      client.setApiKey('new-key');
      
      expect(client.apiKey).toBe('new-key');
      expect(client.defaultHeaders['x-api-key']).toBe('new-key');
    });

    test('should update base URL', () => {
      const client = new TabichanClient('test-key');
      client.setBaseURL('https://new-api.example.com');
      
      expect(client.baseURL).toBe('https://new-api.example.com');
    });
  });
});