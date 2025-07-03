#!/usr/bin/env node

import { TabichanWebSocket } from 'tabichan';

// Configuration
const USER_ID = 'test-user-123';

async function testWebSocket() {
  console.log('🚀 Starting WebSocket client test...\n');

  // Create WebSocket client
  const client = new TabichanWebSocket(USER_ID);
  client.setBaseURL("ws://localhost:8085/v1")

  // Set up event listeners
  client.on('connected', () => {
    console.log('✅ Connected to WebSocket');
  });

  client.on('disconnected', ({ code, reason }) => {
    console.log(`❌ Disconnected: ${code} - ${reason}`);
  });

  client.on('authError', (error) => {
    console.error('🔐 Authentication error:', error.message);
  });

  client.on('error', (error) => {
    console.error('⚠️  Error:', error.message);
  });

  client.on('question', (data) => {
    console.log('❓ Question received:', data);
    
    // Auto-respond to questions for testing
    setTimeout(() => {
      client.sendResponse('I prefer cultural sites and temples')
        .then(() => console.log('✅ Response sent'))
        .catch(err => console.error('❌ Failed to send response:', err.message));
    }, 2000);
  });

  client.on('result', (data) => {
    console.log('📊 Result received:', JSON.stringify(data, null, 2));
  });

  client.on('complete', () => {
    console.log('✅ Chat completed');
    
    // Disconnect after completion
    setTimeout(() => {
      client.disconnect();
      console.log('👋 Disconnected from WebSocket');
      process.exit(0);
    }, 2000);
  });

  client.on('chatError', (error) => {
    console.error('💬 Chat error:', error.message);
  });

  client.on('unknownMessage', (message) => {
    console.log('🔍 Unknown message:', message);
  });

  try {
    // Connect to WebSocket
    console.log('🔌 Connecting to WebSocket...');
    await client.connect();
    
    // Start a chat
    console.log('💬 Starting chat...');
    await client.startChat('Show me interesting places to visit in Tokyo', [], {
      budget: 'medium',
      interests: ['culture', 'food', 'temples']
    });
    
    console.log('⏳ Waiting for responses...\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Goodbye!');
  process.exit(0);
});

// Run the test
testWebSocket();