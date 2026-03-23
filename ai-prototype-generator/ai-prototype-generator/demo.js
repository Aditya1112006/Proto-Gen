#!/usr/bin/env node

/**
 * AI Prototype Generator - Demo Script
 *
 * This script demonstrates the API endpoints and domain detection capabilities.
 * Run with: node demo.js
 */

const API_URL = process.env.API_URL || 'http://localhost:5001';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(title, data = null, type = 'info') {
  const color = type === 'error' ? colors.red : type === 'success' ? colors.green : colors.cyan;
  console.log(`${colors.bright}${color}▶ ${title}${colors.reset}`);
  if (data) {
    if (typeof data === 'string') {
      console.log(data);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  }
  console.log();
}

async function makeRequest(endpoint, method = 'GET', body = null) {
  const url = `${API_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

async function runDemo() {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     AI Prototype Generator - API Demo Script               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);

  // Check health endpoint
  log('1. Checking Health Endpoint', null, 'info');
  const health = await makeRequest('/api/health');
  if (health.data?.status === 'ok') {
    log('Health Check', '✓ Server is running', 'success');
  } else {
    log('Health Check Failed', health.error || 'Server not responding', 'error');
    console.log(`${colors.yellow}Make sure the server is running: npm run server${colors.reset}\n`);
    process.exit(1);
  }

  let sessionId = null;

  // Test 1: Generate a food delivery prototype
  log('2. Generating Food Delivery Prototype', null, 'info');
  const foodPrompt = 'Build a meal-planning app for busy students';
  log('Prompt', foodPrompt, 'info');

  const result1 = await makeRequest('/api/prototype/generate', 'POST', {
    prompt: foodPrompt,
    mode: 'workflow',
  });

  if (result1.data?.success) {
    sessionId = result1.data.sessionId;
    log('Response', {
      sessionId: result1.data.sessionId,
      domain: result1.data.metadata?.domain,
      title: result1.data.metadata?.title,
      totalPrompts: result1.data.metadata?.total_prompt_count,
    }, 'success');
  } else {
    log('Error', result1.data?.error || result1.error, 'error');
  }

  // Test 2: Merge with same domain prompt
  if (sessionId) {
    log('3. Merging Same-Domain Prompt', null, 'info');
    const mergePrompt = 'Add a grocery list export feature to the meal planner';
    log('Prompt', mergePrompt, 'info');

    const result2 = await makeRequest('/api/prototype/generate', 'POST', {
      prompt: mergePrompt,
      mode: 'workflow',
      sessionId,
    });

    if (result2.data?.success) {
      log('Response', {
        domain: result2.data.metadata?.domain,
        domainChanged: result2.data.domainChanged,
        mergedPrompts: result2.data.metadata?.merged_prompt_count,
        totalPrompts: result2.data.metadata?.total_prompt_count,
        changeLog: result2.data.metadata?.change_log,
      }, 'success');
    } else {
      log('Error', result2.data?.error || result2.error, 'error');
    }
  }

  // Test 3: Different domain (should clear and start fresh)
  if (sessionId) {
    log('4. Testing Domain Change (Different Domain)', null, 'info');
    const differentPrompt = 'Create a social media app for pet owners';
    log('Prompt', differentPrompt, 'info');

    const result3 = await makeRequest('/api/prototype/generate', 'POST', {
      prompt: differentPrompt,
      mode: 'workflow',
      sessionId,
    });

    if (result3.data?.success) {
      log('Response', {
        oldDomain: 'food_delivery (implied)',
        newDomain: result3.data.metadata?.domain,
        domainChanged: result3.data.domainChanged,
        mergedPrompts: result3.data.metadata?.merged_prompt_count,
        totalPrompts: result3.data.metadata?.total_prompt_count,
      }, 'success');
      log('Note', 'Domain changed! Previous prototype cleared, new one started.', 'info');
    } else {
      log('Error', result3.data?.error || result3.error, 'error');
    }
  }

  // Test 4: Generate code
  if (sessionId) {
    log('5. Generating Code for Current Prototype', null, 'info');

    const result4 = await makeRequest('/api/prototype/code', 'POST', {
      sessionId,
      lastPrompt: 'Generate React code for the social media pet app',
    });

    if (result4.data?.success) {
      const files = result4.data.files || [];
      log('Response', {
        filesGenerated: files.length,
        fileNames: files.map(f => f.filename),
      }, 'success');

      if (files.length > 0) {
        log('Sample File Content', {
          filename: files[0].filename,
          language: files[0].language,
          contentPreview: files[0].content?.substring(0, 200) + '...',
        }, 'info');
      }
    } else {
      log('Error', result4.data?.error || result4.error, 'error');
    }
  }

  // Test 5: Get session state
  if (sessionId) {
    log('6. Getting Session State', null, 'info');

    const result5 = await makeRequest(`/api/prototype/session/${sessionId}`);

    if (result5.data?.success) {
      log('Session Data', {
        sessionId: result5.data.sessionId,
        domain: result5.data.domain,
        title: result5.data.title,
        totalPrompts: result5.data.totalPromptCount,
        mergedPrompts: result5.data.mergedPromptCount,
      }, 'success');
    } else {
      log('Error', result5.data?.error || result5.error, 'error');
    }
  }

  // Test 6: Clear session
  if (sessionId) {
    log('7. Clearing Session', null, 'info');

    const result6 = await makeRequest('/api/prototype/clear', 'POST', { sessionId });

    if (result6.data?.success) {
      log('Session Cleared', { newSessionId: result6.data.sessionId }, 'success');
    } else {
      log('Error', result6.data?.error || result6.error, 'error');
    }
  }

  // Test 7: Error handling
  log('8. Testing Error Handling (Empty Prompt)', null, 'info');
  const result7 = await makeRequest('/api/prototype/generate', 'POST', {
    prompt: '',
    mode: 'workflow',
  });

  if (!result7.data?.success && result7.data?.error) {
    log('Error Response (Expected)', result7.data.error, 'success');
  }

  console.log(`${colors.bright}${colors.green}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║              Demo Complete!                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
}

runDemo().catch(error => {
  console.error(`${colors.red}Demo failed:${colors.reset}`, error.message);
  process.exit(1);
});
