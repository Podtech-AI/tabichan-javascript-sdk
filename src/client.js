const https = require('https');
const http = require('http');
const { URL } = require('url');

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
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'tabichan-js-sdk/0.1.0',
      'x-api-key': this.apiKey
    };
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
    this.defaultHeaders['x-api-key'] = apiKey;
  }

  setBaseURL(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = new URL(endpoint, this.baseURL);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const headers = {
      ...this.defaultHeaders,
      ...options.headers
    };

    const requestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers,
      timeout: options.timeout || 30000
    };

    return new Promise((resolve, reject) => {
      const req = httpModule.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          let parsedData;
          try {
            parsedData = data ? JSON.parse(data) : null;
          } catch (error) {
            parsedData = data;
          }
          
          const response = {
            data: parsedData,
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers
          };
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            const error = new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`);
            error.response = response;
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (options.body && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
        const body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        req.write(body);
      }

      req.end();
    });
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

module.exports = TabichanClient;