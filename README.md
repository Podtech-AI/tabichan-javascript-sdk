# Tabichan JavaScript SDK

[![Tests](https://github.com/Podtech-AI/tabichan-javascript-sdk/actions/workflows/test.yml/badge.svg)](https://github.com/Podtech-AI/tabichan-javascript-sdk/actions/workflows/test.yml)
[![NPM version](https://img.shields.io/npm/v/@podtechai/tabichan/latest.svg)](https://www.npmjs.com/package/@podtechai/tabichan)
[![Node.js](https://img.shields.io/badge/node.js-14+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

PodTech's Tabichan API SDK for JavaScript/Node.js - Your AI-powered tourism assistant.

## Features

- 🗾 Support for Japan and France tourism queries
- 🔄 Asynchronous chat processing with polling
- 🖼️ Image thumbnails for tourism content
- 🌐 Multi-language support
- 🔒 Secure API key authentication
- 📦 Dual CommonJS/ESM support
- 🎯 Full TypeScript support
- 🔌 Real-time WebSocket support for interactive conversations

## Installation

```bash
npm install tabichan
# or
yarn add tabichan
```

## Quick Start

### Environment Setup

Set your API key as an environment variable:

```bash
export TABICHAN_API_KEY="your-api-key-here"
```

### Basic Usage

```javascript
const TabichanClient = require('tabichan');

// Initialize client with API key from environment
const client = new TabichanClient(); // Uses TABICHAN_API_KEY env var

// Start a chat about Japan tourism
const taskId = await client.startChat(
  "What are the best temples to visit in Kyoto?",
  "user123",
  "japan"
);

// Wait for the response
const result = await client.waitForChat(taskId, true); // verbose = true
console.log(result);
```

### TypeScript Usage

```typescript
import { TabichanClient, type Country, type ChatMessage } from 'tabichan';

const client = new TabichanClient(process.env.TABICHAN_API_KEY);

const history: ChatMessage[] = [
  { role: "user", content: "Hello" },
  { role: "assistant", content: "Hello! How can I help you with your travel plans?" }
];

const taskId = await client.startChat(
  "Tell me about romantic places in Paris",
  "user456",
  "france" as Country,
  history,
  { budget: "mid-range", duration: "3 days" }
);

const result = await client.waitForChat(taskId);
```

### WebSocket Usage (Real-time Interactive Chat)

```javascript
const { TabichanWebSocket } = require('tabichan');

const wsClient = new TabichanWebSocket('user123', 'your-api-key');

// Set up event handlers
wsClient.on('connected', () => {
  console.log('Connected to Tabichan WebSocket');
});

wsClient.on('question', (data) => {
  console.log('Question:', data.question);
  // Answer the question
  wsClient.sendResponse('I prefer cultural attractions');
});

wsClient.on('result', (data) => {
  console.log('Result:', data.result);
});

wsClient.on('complete', () => {
  console.log('Chat completed');
});

wsClient.on('error', (error) => {
  console.error('Error:', error);
});

// Connect and start chat
await wsClient.connect();
await wsClient.startChat('Show me the best temples in Kyoto');
```

### TypeScript WebSocket Usage

```typescript
import { TabichanWebSocket, type WebSocketMessage } from 'tabichan';

const wsClient = new TabichanWebSocket('user123');

wsClient.on('question', (data: { question_id: string; question: string }) => {
  console.log('Question received:', data.question);
  wsClient.sendResponse('My preference is cultural sites');
});

wsClient.on('result', (data: { result: any }) => {
  console.log('Final result:', data.result);
});

await wsClient.connect();
await wsClient.startChat('Plan a 3-day trip to Tokyo', [], { budget: 'mid-range' });
```

### Advanced Usage

```javascript
const TabichanClient = require('tabichan');

const client = new TabichanClient('your-api-key-here');

// Start a chat with history and additional inputs
const taskId = await client.startChat(
  "Tell me about romantic places in Paris",
  "user456",
  "france",
  [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hello! How can I help you with your travel plans?" }
  ],
  { budget: "mid-range", duration: "3 days" }
);

// Poll for status manually
const statusData = await client.pollChat(taskId);
console.log(`Status: ${statusData.status}`);

// Wait for completion
const result = await client.waitForChat(taskId);

// Get related image if available
const imageId = result.itinerary.days[0].activities[0].activity.id;
const imageBase64 = await client.getImage(imageId, "france");
console.log(`Generated image: ${imageBase64.length} characters`);
```

## API Reference

### TabichanClient

#### `constructor(apiKey?: string)`

Initialize the client with your API key. If not provided, uses `TABICHAN_API_KEY` environment variable.

#### `startChat(userQuery: string, userId: string, country?: 'japan' | 'france', history?: ChatMessage[], additionalInputs?: object): Promise<string>`

Start a new chat session and return a task ID.

#### `pollChat(taskId: string): Promise<PollChatResponse>`

Poll the status of a chat task.

#### `waitForChat(taskId: string, verbose?: boolean): Promise<any>`

Wait for a chat task to complete and return the result.

#### `getImage(id: string, country?: 'japan' | 'france'): Promise<string>`

Get a base64-encoded image by ID.

### TabichanWebSocket

#### `constructor(userId: string, apiKey?: string)`

Initialize the WebSocket client with a user ID and API key. If API key is not provided, uses `TABICHAN_API_KEY` environment variable.

#### `connect(): Promise<void>`

Connect to the Tabichan WebSocket server.

#### `disconnect(): void`

Disconnect from the WebSocket server.

#### `startChat(query: string, history?: ChatMessage[], preferences?: object): Promise<void>`

Start an interactive chat session.

#### `sendResponse(response: string): Promise<void>`

Send a response to an active question.

#### Event Handlers

- `on('connected', () => void)` - Fired when connected to the server
- `on('disconnected', (info) => void)` - Fired when disconnected from the server  
- `on('question', (data) => void)` - Fired when the agent asks a question
- `on('result', (data) => void)` - Fired when receiving chat results
- `on('complete', () => void)` - Fired when the chat session is complete
- `on('error', (error) => void)` - Fired on connection or general errors
- `on('authError', (error) => void)` - Fired on authentication errors
- `on('chatError', (error) => void)` - Fired on chat-specific errors

## Development

### Setup

```bash
git clone https://github.com/Podtech-AI/tabichan-javascript-sdk.git
cd tabichan-javascript-sdk
npm install
```

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

### Linting & Type Checking

```bash
# Build TypeScript definitions
npm run build:types
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for your changes
5. Run the test suite (`npm test`)
6. Build the project (`npm run build`)
7. Commit your changes (`git commit -m 'Add amazing feature'`)
8. Push to the branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please contact us at [maxence@podtech.tech](mailto:maxence@podtech.tech) or open an issue on GitHub.

---

Made with ❤️ by [PodTech AI](https://podtech.tech)