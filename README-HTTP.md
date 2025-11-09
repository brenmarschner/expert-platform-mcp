# Expert Platform HTTP API

This is the HTTP API version of the Expert Platform MCP server, designed to work with ChatGPT Enterprise Custom Actions.

## 🚀 Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   - Copy `.env.example` to `.env`
   - Fill in your Supabase and Slack credentials

3. **Build and run:**
   ```bash
   npm run build
   npm run start:http
   ```

4. **Test the API:**
   ```bash
   curl http://localhost:3000/health
   ```

5. **View API documentation:**
   Open http://localhost:3000/api-docs in your browser

## 🌐 Render.com Deployment

### Option 1: Connect GitHub Repository

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/expert-platform-mcp.git
   git push -u origin main
   ```

2. **Deploy on Render:**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Use these settings:
     - **Name:** expert-platform-api
     - **Environment:** Node
     - **Build Command:** `npm install && npm run build`
     - **Start Command:** `npm run start:http`

3. **Set Environment Variables:**
   Add these in Render dashboard:
   ```
   NODE_ENV=production
   SUPABASE_INTERVIEWS_URL=your_interviews_url
   SUPABASE_INTERVIEWS_SERVICE_ROLE_KEY=your_interviews_key
   SUPABASE_EXPERTS_URL=your_experts_url
   SUPABASE_EXPERTS_SERVICE_ROLE_KEY=your_experts_key
   SLACK_WEBHOOK_URL=your_slack_webhook_url
   ANTHROPIC_API_KEY=your_anthropic_key
   ```

### Option 2: Direct Deploy (No GitHub)

1. **Install Render CLI:**
   ```bash
   npm install -g @render/cli
   ```

2. **Login and deploy:**
   ```bash
   render login
   render deploy
   ```

## 🤖 ChatGPT Enterprise Integration

### Step 1: Get Your API URL
After deployment, your API will be available at:
```
https://your-app-name.onrender.com
```

### Step 2: Create Custom GPT

1. Go to ChatGPT Enterprise
2. Click "Create a GPT"
3. In the Configure tab:
   - **Name:** Expert Platform Assistant
   - **Description:** AI assistant for expert interview management and discovery
   - **Instructions:**
     ```
     You are an expert interview management assistant. You help users:
     1. Search and analyze past expert interviews
     2. Find and evaluate experts for new interviews
     3. Create interview guides and generate questions
     4. Launch interview requests and expert sourcing

     Always provide clear, actionable insights and ask clarifying questions when needed.
     ```

### Step 3: Configure Actions

1. Click "Create new action"
2. **Authentication:** None (for now)
3. **Schema:** Import from `https://your-app-name.onrender.com/openapi.yaml`
4. Or manually paste the OpenAPI schema from `openapi.yaml`

### Step 4: Test Integration

Try these example prompts:
- "Search for interviews about fintech regulatory challenges"
- "Find experts who work at Stripe in payments"
- "Generate 10 interview questions about AI in healthcare"
- "Create an interview guide for blockchain experts"

## 📋 Available Endpoints

### Interview Management
- `POST /api/interviews/search` - Search past interviews
- `POST /api/interviews/summarize` - Summarize interview data
- `POST /api/interviews/insights` - Get statistical insights
- `GET /api/interviews/expert-history/{expertId}` - Get expert's interview history

### Expert Discovery
- `POST /api/experts/search` - Search for experts
- `GET /api/experts/profile/{expertId}` - Get expert profile
- `POST /api/experts/availability` - Check expert availability
- `POST /api/experts/analyze-pool` - Analyze expert pool

### Request Management
- `POST /api/requests/create-guide` - Create interview guide
- `POST /api/requests/generate-questions` - Generate questions
- `POST /api/requests/expert-sourcing` - Request expert sourcing
- `POST /api/requests/launch-interview` - Launch complete interview request

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_INTERVIEWS_URL` | Interview database URL | Yes |
| `SUPABASE_INTERVIEWS_SERVICE_ROLE_KEY` | Interview database key | Yes |
| `SUPABASE_EXPERTS_URL` | Expert database URL | Yes |
| `SUPABASE_EXPERTS_SERVICE_ROLE_KEY` | Expert database key | Yes |
| `SLACK_WEBHOOK_URL` | Slack notifications webhook | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI features | Optional |
| `NODE_ENV` | Environment (production/development) | Optional |
| `PORT` | Server port (default: 3000) | Optional |

### Health Check

The API includes a health check endpoint at `/health` that returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-09T17:00:00.000Z",
  "version": "1.0.0"
}
```

## 🛠️ Development

### Scripts

- `npm run build` - Build TypeScript
- `npm run start:http` - Start HTTP server
- `npm run dev:http` - Development mode with watch
- `npm start` - Start original MCP server (stdio)

### API Documentation

Interactive API documentation is available at `/api-docs` when running the server.

### Testing

Test endpoints with curl:

```bash
# Health check
curl http://localhost:3000/health

# Search experts
curl -X POST http://localhost:3000/api/experts/search \
  -H "Content-Type: application/json" \
  -d '{"query": "fintech", "limit": 5}'

# Generate questions
curl -X POST http://localhost:3000/api/requests/generate-questions \
  -H "Content-Type: application/json" \
  -d '{"topic": "AI in healthcare", "questionCount": 5}'
```

## 🔒 Security Notes

- The API currently runs without authentication for simplicity
- In production, consider adding API key authentication
- Environment variables contain sensitive credentials - keep them secure
- Use HTTPS in production (Render provides this automatically)

## 📞 Support

If you encounter issues:
1. Check the Render deployment logs
2. Verify all environment variables are set correctly
3. Test the health endpoint first
4. Check the API documentation at `/api-docs`

## 🎯 Next Steps

Once deployed and connected to ChatGPT:
1. Test all major workflows
2. Add authentication if needed
3. Set up monitoring and alerts
4. Consider rate limiting for production use
5. Add more sophisticated error handling
