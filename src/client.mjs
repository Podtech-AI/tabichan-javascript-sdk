import axios from 'axios';

class TabichanClient {
  constructor(apiKey) {
    if (!apiKey) {
      apiKey = process.env.TABICHAN_API_KEY;
    }
    
    if (!apiKey) {
      throw new Error('API key is not set. Please set the TABICHAN_API_KEY environment variable or pass it as an argument to the TabichanClient constructor.');
    }
    
    this.apiKey = apiKey;
    this.baseURL = 'https://tourism-api.podtech-ai.com/v1';
    this.alternativeBaseURL = 'https://tabichan.podtech-ai.com/v1';
    
    // Create axios instance with default config
    this.axios = axios.create({
      baseURL: this.baseURL,
      headers: {
        'User-Agent': 'tabichan-js-sdk/0.1.0',
        'x-api-key': this.apiKey
      },
      timeout: 30000
    });
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
    this.axios.defaults.headers['x-api-key'] = apiKey;
  }

  setBaseURL(baseURL) {
    this.baseURL = baseURL;
    this.axios.defaults.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    try {
      const config = {
        url: endpoint,
        method: options.method || 'GET',
        timeout: options.timeout || 30000,
        headers: options.headers || {}
      };

      if (options.body && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
        config.data = options.body;
      }

      const response = await this.axios(config);
      
      return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      };
    } catch (error) {
      if (error.response) {
        // Server responded with error status
        const apiError = new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
        apiError.response = {
          data: error.response.data,
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers
        };
        throw apiError;
      } else if (error.request) {
        // Request was made but no response received
        throw new Error(`Request failed: No response received`);
      } else {
        // Something else happened
        throw new Error(`Request failed: ${error.message}`);
      }
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, { 
      ...options, 
      method: 'POST', 
      body: data 
    });
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: data 
    });
  }

  async patch(endpoint, data, options = {}) {
    return this.request(endpoint, { 
      ...options, 
      method: 'PATCH', 
      body: data 
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  async startChat(userQuery, userId, country = 'japan', history = [], additionalInputs = {}) {
    const body = {
      user_query: userQuery,
      user_id: userId,
      country: country,
      history: history,
      additional_inputs: additionalInputs
    };

    const response = await this.request('/chat', {
      method: 'POST',
      body: body,
      timeout: 3000
    });

    return response.data.task_id;
  }

  async pollChat(taskId) {
    const response = await this.request(`/chat/poll?task_id=${taskId}`, {
      method: 'GET',
      timeout: 5000
    });

    return response.data;
  }

  async waitForChat(taskId, verbose = false) {
    let status = 'running';
    const maxAttempts = 30; // Maximum 5 minutes (30 * 10 seconds)
    let attempts = 0;

    while (status !== 'completed' && attempts < maxAttempts) {
      try {
        const pollData = await this.pollChat(taskId);
        status = pollData.status;

        if (status === 'completed') {
          if (verbose) {
            console.log('✅ Generation complete!');
          }
          return pollData.result;
        } else if (status === 'running') {
          if (verbose) {
            console.log(`⏳ Generation still running... (attempt ${attempts + 1}/${maxAttempts})`);
          }
        } else if (status === 'failed') {
          const error = new Error(`Generation failed: ${pollData.error || 'Unknown error'}`);
          error.pollData = pollData;
          throw error;
        } else {
          const error = new Error(`Unexpected status: ${status}`);
          error.pollData = pollData;
          throw error;
        }
      } catch (error) {
        if (error.pollData) {
          throw error;
        }
        throw new Error(`Failed to poll status: ${error.message}`);
      }

      attempts++;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      }
    }

    if (attempts >= maxAttempts) {
      throw new Error('Timeout: Generation took too long');
    }
  }

  async getImage(id, country = 'japan') {
    const response = await this.request(`/image?id=${id}&country=${country}`, {
      method: 'GET',
      timeout: 30000
    });

    return response.data.base64;
  }
}

export default TabichanClient;