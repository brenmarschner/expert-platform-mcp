#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import all tool modules
import { interviewTools, handleInterviewTool } from './tools/interviews.js';
import { expertTools, handleExpertTool } from './tools/experts.js';
import { requestTools, handleRequestTool } from './tools/requests.js';

// Environment validation
try {
  // This will throw if required environment variables are missing
  await import('./config/environment.js');
} catch (error) {
  console.error('Environment validation failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}

// Create MCP server
const server = new Server(
  {
    name: 'expert-platform-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Combine all tools
const allTools = [
  ...interviewTools,
  ...expertTools,
  ...requestTools
];

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Route to appropriate tool handler based on tool name
    if (interviewTools.some(tool => tool.name === name)) {
      return await handleInterviewTool(name, args);
    } else if (expertTools.some(tool => tool.name === name)) {
      return await handleExpertTool(name, args);
    } else if (requestTools.some(tool => tool.name === name)) {
      return await handleRequestTool(name, args);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Expert Platform MCP Server running on stdio');
  console.error('Available tools:', allTools.map(t => t.name).join(', '));
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
