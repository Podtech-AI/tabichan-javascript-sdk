const WebSocket = require('ws');
const EventEmitter = require('events');

class TabichanWebSocket extends EventEmitter {
  constructor(userId, apiKey) {
    super();
    
    if (!userId) {
      throw new Error('userId is required');
    }
    
    if (!apiKey) {
      apiKey = process.env.TABICHAN_API_KEY;
    }
    
    if (!apiKey) {
      throw new Error('API key is not set. Please set the TABICHAN_API_KEY environment variable or pass it as an argument.');
    }
    
    this.userId = userId;
    this.apiKey = apiKey;
    this.ws = null;
    this.isConnected = false;
    this.currentQuestionId = null;
    this.baseURL = 'wss://tabichan.podtech-ai.com/v1';
    this.connectionPromise = null;
  }

  connect() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const wsUrl = `${this.baseURL}/ws/chat/${this.userId}?api_key=${this.apiKey}`;
      
      try {
        this.ws = new WebSocket(wsUrl);
      } catch (error) {
        this.connectionPromise = null;
        reject(error);
        return;
      }

      let connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.terminate();
          this.connectionPromise = null;
          reject(new Error('Connection timeout'));
        }
      }, 10000); // 10 second timeout

      // Store timeout reference for cleanup
      this.connectionTimeout = connectionTimeout;

      const clearTimeoutAndPromise = () => {
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        this.connectionPromise = null;
      };

      this.ws.on('open', () => {
        clearTimeoutAndPromise();
        this.isConnected = true;
        this.emit('connected');
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          this.emit('error', new Error(`Failed to parse message: ${error.message}`));
        }
      });

      this.ws.on('error', (error) => {
        clearTimeoutAndPromise();
        this.emit('error', error);
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        clearTimeoutAndPromise();
        this.isConnected = false;
        this.currentQuestionId = null;
        
        const reasonString = reason ? reason.toString() : '';
        
        if (code === 1008) {
          this.emit('authError', new Error('Authentication failed: Invalid API key'));
        } else {
          this.emit('disconnected', { code, reason: reasonString });
        }
      });
    });

    return this.connectionPromise;
  }

  handleMessage(message) {
    this.emit('message', message);
    
    switch (message.type) {
      case 'question':
        this.currentQuestionId = message.data.question_id;
        this.emit('question', message.data);
        break;
      case 'result':
        this.emit('result', message.data);
        break;
      case 'error':
        this.emit('chatError', new Error(message.data));
        break;
      case 'complete':
        this.currentQuestionId = null;
        this.emit('complete');
        break;
      default:
        this.emit('unknownMessage', message);
    }
  }

  async startChat(query, history = [], preferences = {}) {
    if (!this.isConnected) {
      throw new Error('WebSocket is not connected. Call connect() first.');
    }

    const message = {
      type: 'chat_request',
      query,
      history,
      preferences
    };

    return this.sendMessage(message);
  }

  async sendResponse(response) {
    if (!this.isConnected) {
      throw new Error('WebSocket is not connected');
    }
    
    if (!this.currentQuestionId) {
      throw new Error('No active question to respond to');
    }

    const message = {
      type: 'response',
      question_id: this.currentQuestionId,
      response
    };

    const result = await this.sendMessage(message);
    this.currentQuestionId = null;
    return result;
  }

  sendMessage(message) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not open'));
        return;
      }

      try {
        this.ws.send(JSON.stringify(message));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.isConnected = false;
    this.currentQuestionId = null;
    this.connectionPromise = null;
  }

  // Utility methods
  getConnectionState() {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'closed';
      default:
        return 'unknown';
    }
  }

  hasActiveQuestion() {
    return this.currentQuestionId !== null;
  }

  setBaseURL(baseURL) {
    if (this.isConnected) {
      throw new Error('Cannot change base URL while connected');
    }
    this.baseURL = baseURL;
  }
}

module.exports = TabichanWebSocket;