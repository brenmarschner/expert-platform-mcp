#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Import existing tool handlers
import { handleInterviewTool } from './tools/interviews.js';
import { handleExpertTool } from './tools/experts.js';
import { handleRequestTool } from './tools/requests.js';

// Environment validation
try {
  await import('./config/environment.js');
} catch (error) {
  console.error('Environment validation failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Create MCP server for ChatGPT connector
const mcpServer = new Server(
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

// Define MCP tools for ChatGPT
const mcpTools = [
  {
    name: 'search_insights',
    description: 'Search expert interviews for investment diligence insights. Find expert opinions on market dynamics, competitive positioning, business strategy, operational challenges, and industry trends. Returns actual expert quotes with credibility scores.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Investment diligence question about business strategy, market trends, competitive dynamics, or operational challenges. Examples: "competitive dynamics in fintech", "pricing strategy challenges", "market consolidation trends", "technology adoption barriers"',
        },
        expertName: {
          type: 'string',
          description: 'Filter by specific expert name (e.g., "Rudy Alanis", "Aaron Birnbaum")',
        },
        minCredibilityScore: {
          type: 'number',
          description: 'Minimum credibility score (0-10) to filter high-quality responses. Use 7+ for highly credible experts.',
          minimum: 0,
          maximum: 10,
        },
        limit: {
          type: 'number',
          description: 'Number of results to return',
          default: 10,
          minimum: 1,
          maximum: 50,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'search_experts',
    description: 'Find current and former employees of specific companies by role. Optimized for sourcing experts with experience at target companies for interviews and research. Uses AI to map queries to company + role combinations.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Description of experts to find, focusing on company + role combinations. Examples: "former Google product managers", "current Stripe executives", "McKinsey consultants", "healthcare startup founders", "enterprise sales leaders at Salesforce"',
        },
        currentCompany: {
          type: 'string',
          description: 'Specific company name to filter by (e.g., "Korn Ferry", "Google", "Stripe")',
        },
        currentTitle: {
          type: 'string',
          description: 'Specific job title to filter by (e.g., "VP", "Director", "Chief")',
        },
        location: {
          type: 'string',
          description: 'Geographic location filter (e.g., "San Francisco", "New York")',
        },
        limit: {
          type: 'number',
          description: 'Number of results to return',
          default: 10,
          minimum: 1,
          maximum: 50,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'generate_questions',
    description: 'Generate interview questions for a specific topic or expert type. Useful for creating interview guides.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The main topic or research area (e.g., "fintech regulatory challenges", "AI in healthcare")',
        },
        expertBackground: {
          type: 'string',
          description: 'Type of expert to interview (e.g., "fintech executive", "AI researcher")',
        },
        questionCount: {
          type: 'number',
          description: 'Number of questions to generate',
          default: 10,
          minimum: 5,
          maximum: 25,
        },
        difficulty: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          description: 'Difficulty level of questions',
          default: 'intermediate',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'fetch_profile',
    description: 'Get detailed expert profile and background information by expert ID or name.',
    inputSchema: {
      type: 'object',
      properties: {
        expertId: {
          type: 'string',
          description: 'Expert UUID to fetch detailed profile',
        },
        expertName: {
          type: 'string',
          description: 'Expert name to search and fetch profile',
        },
      },
    },
  },
  {
    name: 'get_full_interview',
    description: 'Get complete interview transcript and summary by meeting ID. Returns all questions and answers from a single interview session with expert profile.',
    inputSchema: {
      type: 'object',
      properties: {
        meetingId: {
          type: 'string',
          description: 'The meeting ID of the interview to retrieve (e.g., "98302656417")',
        },
      },
      required: ['meetingId'],
    },
  },
];

// MCP tool handlers are set up below in the POST /mcp endpoint

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Expert Platform API',
      version: '1.0.0',
      description: 'API for expert interview management and discovery',
    },
    servers: [
      {
        url: process.env.API_BASE_URL || `http://localhost:${PORT}`,
        description: 'Expert Platform API Server',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/http-server.ts'],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Expert Platform API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      interviews: '/api/interviews',
      experts: '/api/experts', 
      requests: '/api/requests'
    }
  });
});

// Generic tool handler wrapper
async function handleToolRequest(toolHandler: Function, toolName: string, args: any) {
  try {
    const result = await toolHandler(toolName, args);
    
    // Extract the text content from MCP response format
    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content.find((c: any) => c.type === 'text');
      if (textContent) {
        try {
          // Try to parse as JSON if possible
          const parsedContent = JSON.parse(textContent.text);
          return {
            success: true,
            data: parsedContent,
            tool: toolName
          };
        } catch {
          // Return as plain text if not JSON
          return {
            success: true,
            data: textContent.text,
            tool: toolName
          };
        }
      }
    }
    
    return {
      success: true,
      data: result,
      tool: toolName
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      tool: toolName
    };
  }
}

// Interview endpoints
/**
 * @swagger
 * /api/interviews/search:
 *   post:
 *     summary: Search interview messages
 *     description: Search and filter interview messages from past expert interviews
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expertName:
 *                 type: string
 *                 description: Filter by expert name
 *               projectId:
 *                 type: number
 *                 description: Filter by project ID
 *               questionTopic:
 *                 type: string
 *                 description: Search for interviews about this topic
 *               dateFrom:
 *                 type: string
 *                 format: date
 *                 description: Filter interviews from this date
 *               dateTo:
 *                 type: string
 *                 format: date
 *                 description: Filter interviews to this date
 *               minConsensusScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10
 *                 description: Minimum consensus score
 *               minCredibilityScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 10
 *                 description: Minimum credibility score
 *               limit:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 20
 *                 description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results
 */
app.post('/api/interviews/search', async (req, res) => {
  const result = await handleToolRequest(handleInterviewTool, 'search_interviews', req.body);
  res.json(result);
});

/**
 * @swagger
 * /api/interviews/summarize:
 *   post:
 *     summary: Summarize interviews
 *     description: Generate comprehensive summaries of interview data
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expertName:
 *                 type: string
 *               projectId:
 *                 type: number
 *               questionTopic:
 *                 type: string
 *               dateFrom:
 *                 type: string
 *                 format: date
 *               dateTo:
 *                 type: string
 *                 format: date
 *               focusArea:
 *                 type: string
 *                 description: What aspect to focus the summary on
 *     responses:
 *       200:
 *         description: Interview summary
 */
app.post('/api/interviews/summarize', async (req, res) => {
  const result = await handleToolRequest(handleInterviewTool, 'summarize_interviews', req.body);
  res.json(result);
});

/**
 * @swagger
 * /api/interviews/insights:
 *   post:
 *     summary: Get interview insights
 *     description: Get statistical insights and quality metrics from interview data
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expertName:
 *                 type: string
 *               projectId:
 *                 type: number
 *               questionTopic:
 *                 type: string
 *               dateFrom:
 *                 type: string
 *                 format: date
 *               dateTo:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Interview insights and metrics
 */
app.post('/api/interviews/insights', async (req, res) => {
  const result = await handleToolRequest(handleInterviewTool, 'get_interview_insights', req.body);
  res.json(result);
});

/**
 * @swagger
 * /api/interviews/expert-history/{expertId}:
 *   get:
 *     summary: Get expert interview history
 *     description: Get complete interview history for a specific expert
 *     parameters:
 *       - in: path
 *         name: expertId
 *         required: true
 *         schema:
 *           type: number
 *         description: The expert ID
 *     responses:
 *       200:
 *         description: Expert interview history
 */
app.get('/api/interviews/expert-history/:expertId', async (req, res) => {
  const expertId = parseInt(req.params.expertId);
  if (isNaN(expertId)) {
    return res.status(400).json({ success: false, error: 'Invalid expert ID' });
  }
  
  const result = await handleToolRequest(handleInterviewTool, 'get_expert_interview_history', { expertId });
  res.json(result);
});

// Expert endpoints
/**
 * @swagger
 * /api/experts/search:
 *   post:
 *     summary: Search experts
 *     description: Search for experts using the existing expert database
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query for expert skills, experience, or background
 *               currentCompany:
 *                 type: string
 *                 description: Filter by current company name
 *               currentTitle:
 *                 type: string
 *                 description: Filter by current job title
 *               location:
 *                 type: string
 *                 description: Filter by location
 *               limit:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 50
 *                 default: 10
 *                 description: Maximum number of results
 *     responses:
 *       200:
 *         description: Expert search results
 */
app.post('/api/experts/search', async (req, res) => {
  if (!req.body.query) {
    return res.status(400).json({ success: false, error: 'Query parameter is required' });
  }
  
  const result = await handleToolRequest(handleExpertTool, 'search_experts', req.body);
  res.json(result);
});

/**
 * @swagger
 * /api/experts/profile/{expertId}:
 *   get:
 *     summary: Get expert profile
 *     description: Get detailed profile information for a specific expert
 *     parameters:
 *       - in: path
 *         name: expertId
 *         required: true
 *         schema:
 *           type: string
 *         description: The expert UUID
 *     responses:
 *       200:
 *         description: Expert profile
 */
app.get('/api/experts/profile/:expertId', async (req, res) => {
  const result = await handleToolRequest(handleExpertTool, 'get_expert_profile', { expertId: req.params.expertId });
  res.json(result);
});

/**
 * @swagger
 * /api/experts/availability:
 *   post:
 *     summary: Check expert availability
 *     description: Check the availability and scheduling status of experts
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expertIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of expert UUIDs to check
 *               state:
 *                 type: string
 *                 enum: [vetting, ready_to_schedule, scheduled, completed, disqualified]
 *                 description: Filter experts by their current state
 *     responses:
 *       200:
 *         description: Expert availability information
 */
app.post('/api/experts/availability', async (req, res) => {
  const result = await handleToolRequest(handleExpertTool, 'get_expert_availability', req.body);
  res.json(result);
});

/**
 * @swagger
 * /api/experts/analyze-pool:
 *   post:
 *     summary: Analyze expert pool
 *     description: Analyze the available expert pool for patterns and trends
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               focusArea:
 *                 type: string
 *                 description: Focus the analysis on a specific area
 *               includeMetrics:
 *                 type: boolean
 *                 default: true
 *                 description: Include performance metrics from past interviews
 *     responses:
 *       200:
 *         description: Expert pool analysis
 */
app.post('/api/experts/analyze-pool', async (req, res) => {
  const result = await handleToolRequest(handleExpertTool, 'analyze_expert_pool', req.body);
  res.json(result);
});

// Request endpoints
/**
 * @swagger
 * /api/requests/create-guide:
 *   post:
 *     summary: Create interview guide
 *     description: Create a structured interview guide with questions and notify team via Slack
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - questions
 *               - expertCriteria
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the interview guide
 *               description:
 *                 type: string
 *                 description: Description of what this interview aims to discover
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - question
 *                     - category
 *                     - priority
 *                   properties:
 *                     question:
 *                       type: string
 *                     category:
 *                       type: string
 *                       enum: [background, experience, technical, opinion, scenario]
 *                     priority:
 *                       type: string
 *                       enum: [high, medium, low]
 *                     followUpSuggestions:
 *                       type: array
 *                       items:
 *                         type: string
 *               expertCriteria:
 *                 type: object
 *                 properties:
 *                   currentCompany:
 *                     type: string
 *                   recentCompanies:
 *                     type: array
 *                     items:
 *                       type: string
 *                   currentTitle:
 *                     type: string
 *                   recentTitles:
 *                     type: array
 *                     items:
 *                       type: string
 *                   experienceYears:
 *                     type: number
 *                   location:
 *                     type: string
 *                   industryExperience:
 *                     type: array
 *                     items:
 *                       type: string
 *               requestedBy:
 *                 type: string
 *                 default: MCP User
 *     responses:
 *       200:
 *         description: Interview guide created successfully
 */
app.post('/api/requests/create-guide', async (req, res) => {
  const result = await handleToolRequest(handleRequestTool, 'create_interview_guide', req.body);
  res.json(result);
});

/**
 * @swagger
 * /api/requests/generate-questions:
 *   post:
 *     summary: Generate interview questions
 *     description: Generate suggested interview questions based on a topic or research area
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *                 description: The main topic or research area for the interview
 *               expertBackground:
 *                 type: string
 *                 description: Background of the type of expert you want to interview
 *               focusAreas:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific areas to focus on within the topic
 *               questionCount:
 *                 type: number
 *                 minimum: 5
 *                 maximum: 25
 *                 default: 10
 *                 description: Number of questions to generate
 *               difficulty:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced]
 *                 default: intermediate
 *                 description: Difficulty level of questions
 *     responses:
 *       200:
 *         description: Generated interview questions
 */
app.post('/api/requests/generate-questions', async (req, res) => {
  if (!req.body.topic) {
    return res.status(400).json({ success: false, error: 'Topic parameter is required' });
  }
  
  const result = await handleToolRequest(handleRequestTool, 'generate_interview_questions', req.body);
  res.json(result);
});

/**
 * @swagger
 * /api/requests/expert-sourcing:
 *   post:
 *     summary: Request expert sourcing
 *     description: Create a request for sourcing new experts and notify team via Slack
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requestTitle
 *               - description
 *               - expertCriteria
 *             properties:
 *               requestTitle:
 *                 type: string
 *                 description: Title of the expert sourcing request
 *               description:
 *                 type: string
 *                 description: Detailed description of what type of expert is needed
 *               expertCriteria:
 *                 type: object
 *                 properties:
 *                   currentCompany:
 *                     type: string
 *                   recentCompanies:
 *                     type: array
 *                     items:
 *                       type: string
 *                   currentTitle:
 *                     type: string
 *                   recentTitles:
 *                     type: array
 *                     items:
 *                       type: string
 *                   experienceYears:
 *                     type: number
 *                   location:
 *                     type: string
 *                   industryExperience:
 *                     type: array
 *                     items:
 *                       type: string
 *               urgency:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *               budget:
 *                 type: number
 *               timeline:
 *                 type: string
 *               requestedBy:
 *                 type: string
 *                 default: MCP User
 *     responses:
 *       200:
 *         description: Expert sourcing request created successfully
 */
app.post('/api/requests/expert-sourcing', async (req, res) => {
  const result = await handleToolRequest(handleRequestTool, 'request_expert_sourcing', req.body);
  res.json(result);
});

/**
 * @swagger
 * /api/requests/launch-interview:
 *   post:
 *     summary: Launch interview request
 *     description: Combine an interview guide with expert criteria and launch a complete interview request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - interviewGuide
 *             properties:
 *               interviewGuide:
 *                 type: object
 *                 required:
 *                   - title
 *                   - description
 *                   - questions
 *                   - expertCriteria
 *                 properties:
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   questions:
 *                     type: array
 *                     items:
 *                       type: object
 *                       required:
 *                         - question
 *                         - category
 *                         - priority
 *                       properties:
 *                         question:
 *                           type: string
 *                         category:
 *                           type: string
 *                           enum: [background, experience, technical, opinion, scenario]
 *                         priority:
 *                           type: string
 *                           enum: [high, medium, low]
 *                         followUpSuggestions:
 *                           type: array
 *                           items:
 *                             type: string
 *                   expertCriteria:
 *                     type: object
 *                     properties:
 *                       currentCompany:
 *                         type: string
 *                       recentCompanies:
 *                         type: array
 *                         items:
 *                           type: string
 *                       currentTitle:
 *                         type: string
 *                       recentTitles:
 *                         type: array
 *                         items:
 *                           type: string
 *                       experienceYears:
 *                         type: number
 *                       location:
 *                         type: string
 *                       industryExperience:
 *                         type: array
 *                         items:
 *                           type: string
 *               urgency:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *               requestedBy:
 *                 type: string
 *                 default: MCP User
 *     responses:
 *       200:
 *         description: Interview request launched successfully
 */
app.post('/api/requests/launch-interview', async (req, res) => {
  const result = await handleToolRequest(handleRequestTool, 'launch_interview_request', req.body);
  res.json(result);
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// MCP endpoint for ChatGPT connector - Server-Sent Events (SSE) for MCP protocol
app.get('/mcp', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const sessionId = Math.random().toString(36).substring(2, 15);
  res.write(`event: endpoint\ndata: /mcp?sessionId=${sessionId}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`:heartbeat\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

app.post('/mcp', async (req, res) => {
  try {
    console.log('MCP JSON-RPC request:', JSON.stringify(req.body, null, 2));
    
    // Handle MCP JSON-RPC requests
    const { method, params, id } = req.body;
    
    if (method === 'initialize') {
      // Required MCP handshake method
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'expert-platform-mcp',
            version: '1.0.0'
          }
        }
      });
    } else if (method === 'tools/list') {
      // Return available tools
      res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: mcpTools
        }
      });
    } else if (method === 'tools/call') {
      // Handle tool calls
      const { name, arguments: args } = params;
      
      try {
        let result;
        switch (name) {
          case 'search_insights': {
            const searchParams = {
              questionTopic: args?.query,
              expertName: args?.expertName,
              minCredibilityScore: args?.minCredibilityScore,
              limit: args?.limit || 10,
            };
            result = await handleInterviewTool('search_interviews', searchParams);
            break;
          }
          case 'search_experts': {
            const searchParams = {
              query: args?.query,
              currentCompany: args?.currentCompany,
              currentTitle: args?.currentTitle,
              location: args?.location,
              limit: args?.limit || 10,
            };
            result = await handleExpertTool('search_experts', searchParams);
            break;
          }
          case 'generate_questions': {
            const questionParams = {
              topic: args?.topic,
              expertBackground: args?.expertBackground,
              questionCount: args?.questionCount || 10,
              difficulty: args?.difficulty || 'intermediate',
            };
            result = await handleRequestTool('generate_interview_questions', questionParams);
            break;
          }
          case 'fetch_profile': {
            if (args?.expertId) {
              result = await handleExpertTool('get_expert_profile', { expertId: args.expertId });
            } else if (args?.expertName) {
              const searchResult = await handleExpertTool('search_experts', { 
                query: args.expertName, 
                limit: 1 
              });
              
              if (searchResult.content && searchResult.content[0]) {
                const searchData = JSON.parse(searchResult.content[0].text);
                if (searchData.data && searchData.data.experts && searchData.data.experts.length > 0) {
                  const expertId = searchData.data.experts[0].id;
                  result = await handleExpertTool('get_expert_profile', { expertId });
                } else {
                  result = {
                    content: [{ type: 'text', text: `Expert "${args.expertName}" not found.` }]
                  };
                }
              }
            } else {
              throw new Error('Either expertId or expertName is required');
            }
            break;
          }
          case 'get_full_interview': {
            const meetingId = args?.meetingId;
            if (!meetingId) {
              throw new Error('meetingId is required');
            }
            result = await handleInterviewTool('get_full_interview', { meetingId });
            break;
          }
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        res.json({
          jsonrpc: '2.0',
          id,
          result
        });
      } catch (error) {
        res.json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -1,
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    } else {
      // Unknown method
      res.json({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      });
    }
  } catch (error) {
    console.error('MCP POST error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal error'
      }
    });
  }
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `${req.method} ${req.path} is not a valid endpoint`
  });
});

// Start server
const server = app.listen(PORT, async () => {
  console.log(`🚀 Expert Platform API Server running on port ${PORT}`);
  console.log(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
  console.log(`🔗 MCP Connector available at http://localhost:${PORT}/mcp`);
  console.log(`🔍 Available endpoints:`);
  console.log(`   - GET  /health - Health check`);
  console.log(`   - POST /api/interviews/search - Search interviews`);
  console.log(`   - POST /api/interviews/summarize - Summarize interviews`);
  console.log(`   - POST /api/interviews/insights - Get interview insights`);
  console.log(`   - GET  /api/interviews/expert-history/:expertId - Get expert history`);
  console.log(`   - POST /api/experts/search - Search experts`);
  console.log(`   - GET  /api/experts/profile/:expertId - Get expert profile`);
  console.log(`   - POST /api/experts/availability - Check availability`);
  console.log(`   - POST /api/experts/analyze-pool - Analyze expert pool`);
  console.log(`   - POST /api/requests/create-guide - Create interview guide`);
  console.log(`   - POST /api/requests/generate-questions - Generate questions`);
  console.log(`   - POST /api/requests/expert-sourcing - Request expert sourcing`);
  console.log(`   - POST /api/requests/launch-interview - Launch interview request`);
  console.log(`🤖 MCP Tools: search_insights, search_experts, generate_questions, fetch_profile`);
  console.log(`✅ MCP endpoints configured at /mcp`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export default app;
