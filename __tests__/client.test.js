const TabichanClient = require('../src/client');

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('TabichanClient', () => {
  let mockAxiosInstance;
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env;
    
    // Create a clean environment for each test
    process.env = { ...originalEnv };
    
    // Create a mock function for the axios instance
    mockAxiosInstance = jest.fn();
    
    // Add the defaults property
    mockAxiosInstance.defaults = {
      headers: {},
      baseURL: ''
    };
    
    // Mock axios.create to return our mock instance
    axios.create = jest.fn(() => mockAxiosInstance);
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
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://tourism-api.podtech-ai.com/v1',
        headers: {
          'User-Agent': 'tabichan-js-sdk/0.1.0',
          'x-api-key': apiKey
        },
        timeout: 30000
      });
    });

    test('should initialize with API key from environment variable', () => {
      process.env.TABICHAN_API_KEY = 'env-api-key';
      const client = new TabichanClient();
      
      expect(client.apiKey).toBe('env-api-key');
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://tourism-api.podtech-ai.com/v1',
        headers: {
          'User-Agent': 'tabichan-js-sdk/0.1.0',
          'x-api-key': 'env-api-key'
        },
        timeout: 30000
      });
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

    beforeEach(() => {
      process.env.TABICHAN_API_KEY = 'test-key';
      client = new TabichanClient();
    });

    const mockSuccessfulResponse = (responseData) => {
      const mockResponse = {
        data: responseData,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' }
      };
      
      mockAxiosInstance.mockResolvedValue(mockResponse);
      return mockResponse;
    };

    test('should start chat successfully', async () => {
      const responseData = { task_id: 'test-task-id' };
      mockSuccessfulResponse(responseData);

      const taskId = await client.startChat('Test query', 'user123');

      expect(taskId).toBe('test-task-id');
      expect(mockAxiosInstance).toHaveBeenCalledWith({
        url: '/chat',
        method: 'POST',
        timeout: 3000,
        headers: {},
        data: {
          user_query: 'Test query',
          user_id: 'user123',
          country: 'japan',
          history: [],
          additional_inputs: {}
        }
      });
    });

    test('should start chat with all parameters', async () => {
      const responseData = { task_id: 'france-task-id' };
      mockSuccessfulResponse(responseData);

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
      expect(mockAxiosInstance).toHaveBeenCalledWith({
        url: '/chat',
        method: 'POST',
        timeout: 3000,
        headers: {},
        data: {
          user_query: 'France query',
          user_id: 'user456',
          country: 'france',
          history: history,
          additional_inputs: additionalInputs
        }
      });
    });

    test('should poll chat successfully', async () => {
      const responseData = { 
        status: 'completed', 
        result: { answer: 'Test response' } 
      };
      mockSuccessfulResponse(responseData);

      const result = await client.pollChat('test-task');

      expect(result.status).toBe('completed');
      expect(result.result.answer).toBe('Test response');
      expect(mockAxiosInstance).toHaveBeenCalledWith({
        url: '/chat/poll?task_id=test-task',
        method: 'GET',
        timeout: 5000,
        headers: {}
      });
    });

    test('should get image successfully', async () => {
      const responseData = { base64: 'test-base64-data' };
      mockSuccessfulResponse(responseData);

      const imageData = await client.getImage('test-id');

      expect(imageData).toBe('test-base64-data');
      expect(mockAxiosInstance).toHaveBeenCalledWith({
        url: '/image?id=test-id&country=japan',
        method: 'GET',
        timeout: 30000,
        headers: {}
      });
    });

    test('should get image with france country', async () => {
      const responseData = { base64: 'france-image-data' };
      mockSuccessfulResponse(responseData);

      const imageData = await client.getImage('fr-image', 'france');

      expect(imageData).toBe('france-image-data');
      expect(mockAxiosInstance).toHaveBeenCalledWith({
        url: '/image?id=fr-image&country=france',
        method: 'GET',
        timeout: 30000,
        headers: {}
      });
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
      const axiosError = new Error('Request failed with status code 404');
      axiosError.response = {
        data: { error: 'Not found' },
        status: 404,
        statusText: 'Not Found',
        headers: {}
      };

      mockAxiosInstance.mockRejectedValue(axiosError);

      await expect(client.startChat('Test', 'user')).rejects.toThrow('HTTP 404: Not Found');
    });

    test('should handle request errors (no response)', async () => {
      const axiosError = new Error('Network Error');
      axiosError.request = {};

      mockAxiosInstance.mockRejectedValue(axiosError);

      await expect(client.startChat('Test', 'user')).rejects.toThrow('Request failed: No response received');
    });

    test('should handle other errors', async () => {
      const axiosError = new Error('Something went wrong');

      mockAxiosInstance.mockRejectedValue(axiosError);

      await expect(client.startChat('Test', 'user')).rejects.toThrow('Request failed: Something went wrong');
    });
  });

  describe('Utility Methods', () => {
    test('should update API key', () => {
      const client = new TabichanClient('initial-key');
      client.setApiKey('new-key');
      
      expect(client.apiKey).toBe('new-key');
      expect(client.axios.defaults.headers['x-api-key']).toBe('new-key');
    });

    test('should update base URL', () => {
      const client = new TabichanClient('test-key');
      client.setBaseURL('https://new-api.example.com');
      
      expect(client.baseURL).toBe('https://new-api.example.com');
      expect(client.axios.defaults.baseURL).toBe('https://new-api.example.com');
    });
  });
});