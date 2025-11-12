# Expert Platform MCP Server - Collaborator Guide

Welcome! This guide will help you understand and work with the Expert Platform MCP Server.

---

## 🎯 What This System Does

An AI-powered expert research platform integrated with ChatGPT Enterprise for investment diligence. It provides:

- **Expert insights search** - Find actual expert opinions from interview transcripts
- **Expert discovery** - Find current/former employees of companies  
- **AI synthesis** - Aggregate and analyze expert opinions
- **Interview requests** - Schedule expert interviews via Slack notifications

---

## 🏗️ Architecture Overview

### Tech Stack:
- **Language:** TypeScript (ES Modules)
- **Runtime:** Node.js 20+
- **API Framework:** Express.js
- **Databases:** 2 Supabase projects (interviews + experts)
- **AI:** Claude Sonnet 4.5 (Anthropic)
- **Deployment:** Render.com
- **Integration:** MCP Protocol for ChatGPT

### Dual Protocol Support:
- **HTTP REST API**: 12 endpoints at `/api/*` for programmatic access
- **MCP Protocol**: 7 tools at `/mcp` for ChatGPT integration

---

## 📁 Project Structure

```
src/
├── index.ts              # Original MCP stdio server (not used in production)
├── http-server.ts        # Main HTTP + MCP server (PRODUCTION)
├── config/
│   └── environment.ts    # Environment variable validation
├── services/
│   ├── supabase.ts      # Database queries and AI agent
│   └── slack.ts         # Slack notifications
├── tools/
│   ├── interviews.ts    # Interview search and synthesis
│   ├── experts.ts       # Expert discovery
│   └── requests.ts      # Question generation and requests
├── types/
│   └── schema.ts        # TypeScript interfaces
└── utils/
    └── validation.ts    # Zod schemas

Documentation:
├── README.md                  # Original overview
├── README-HTTP.md             # HTTP API deployment
├── CHATGPT-INTEGRATION.md     # MCP setup guide
├── USAGE-GUIDE.md             # How to use tools
├── SLACK-INTEGRATION.md       # Slack notification setup
├── PROJECT-COMPLETE.md        # System overview
└── FINAL-SUMMARY.md           # Complete summary
```

---

## 🚀 Quick Start

### 1. Clone and Install:
```bash
git clone https://github.com/brenmarschner/expert-platform-mcp.git
cd expert-platform-mcp
npm install
```

### 2. Set Up Environment:
Create `.env` file:
```bash
SUPABASE_INTERVIEWS_URL=https://sazkrggdyfkdzdqcsiuo.supabase.co
SUPABASE_INTERVIEWS_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_EXPERTS_URL=https://fgbctkcdpwexbuyuuosi.supabase.co
SUPABASE_EXPERTS_SERVICE_ROLE_KEY=your_service_role_key
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Build and Run:
```bash
npm run build
npm run start:http  # Starts HTTP + MCP server on port 3000
```

### 4. Test Locally:
```bash
# Health check
curl http://localhost:3000/health

# Test MCP endpoint
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
```

---

## 🛠️ Key Components

### 1. Database Layer (`src/services/supabase.ts`)

**Interview Search:**
- Direct text search across `question_text` and `answer_summary`
- Keyword extraction for verbose queries
- Filters: expert name, date range, credibility score

**Expert Search:**
- AI-powered query → company/role conversion
- Uses `search_experts_company_role` Supabase function
- Smart fallback patterns for common queries
- Returns profiles with LinkedIn and work history

**Key Method:** `searchExperts()`
- Calls Claude Sonnet 4.5 to extract companies/roles
- Falls back to pattern detection if AI fails
- Generates 5 strategic search variations

### 2. MCP Server (`src/http-server.ts`)

**7 MCP Tools for ChatGPT:**

1. **search_insights** - Find expert opinions on topics
2. **synthesize_insights** - AI-powered analysis of multiple interviews
3. **search_experts** - Find current/former employees
4. **generate_questions** - Create interview guides
5. **fetch_profile** - Get expert details
6. **get_full_interview** - Access complete interview transcripts
7. **request_expert_interview** - Request scheduling (→ Slack notification)

**MCP Protocol:**
- GET `/mcp` - Server-Sent Events for connection
- POST `/mcp` - JSON-RPC 2.0 for tool calls
- Handles: `initialize`, `tools/list`, `tools/call`

### 3. Slack Integration (`src/services/slack.ts`)

**notifyExpertInterviewRequest:**
- Triggered by `request_expert_interview` tool
- Sends rich notification with expert details
- Includes research topic and urgency
- Action buttons for team workflow

---

## 🔍 How AI Agent Works

### Expert Search AI Agent:

**Purpose:** Convert natural language → company/role searches

**Example:**
```
Input: "former Adobe product managers"
↓
AI Agent extracts:
{
  companies: ["Adobe"],
  role_keywords: ["Product", "Manager", "Product Manager"],
  employment_status: "former"
}
↓
Supabase function searches for matches
↓
Returns: Former Adobe PMs now at other companies
```

**Fallback:** If AI fails, pattern detection catches common queries (Big 5, consulting, tech giants, etc.)

### Insights Keyword Extraction:

**Purpose:** Extract key terms from verbose queries

**Example:**
```
Input: "interviews with customers of EASM software; deployment experiences"
↓
Extraction removes filler words:
Output: "external attack surface management deployment"
↓
Searches interview database
```

---

## 🧪 Testing

### Local Testing:
```bash
# Test HTTP API
curl -X POST http://localhost:3000/api/experts/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Google engineering", "limit": 5}'

# Test MCP protocol
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_experts",
      "arguments": {"query": "Big 5 firms", "limit": 5}
    }
  }'
```

### Production Testing:
```bash
# Replace with production URL
curl https://expert-platform-mcp-1.onrender.com/health
```

---

## 🔧 Common Development Tasks

### Add a New MCP Tool:

1. **Define tool** in `mcpTools` array (`http-server.ts`)
2. **Add handler** in POST `/mcp` switch statement
3. **Implement logic** in appropriate tool file
4. **Build and test**: `npm run build && npm run start:http`

### Modify Search Logic:

**Interview Search:** Edit `searchInterviews()` in `supabase.ts`  
**Expert Search AI:** Edit `generateSearchQueries()` prompt  
**Fallback Patterns:** Edit fallback logic in `generateSearchQueries()`

### Add Slack Notification:

1. **Create method** in `SlackService`
2. **Call from tool handler** (non-blocking try/catch)
3. **Test with real webhook URL**

---

## 🐛 Debugging

### Check Render Logs:
```bash
# In Render dashboard: Logs tab
# Look for:
- "Calling AI agent for query: ..."
- "AI agent generated X searches"
- "Fallback triggered for query: ..."
- "Slack notification sent"
```

### Common Issues:

**Issue:** Expert search returns 0 results
- **Check:** AI agent logs - what companies/roles did it generate?
- **Check:** Does your database have those companies?
- **Fix:** Add to fallback patterns or verify database content

**Issue:** Verbose queries return 0 results  
- **Check:** Keyword extraction in logs
- **Fix:** Adjust filler word list or extraction logic

**Issue:** Slack notifications not working
- **Check:** Webhook URL in Render environment
- **Check:** Slack app has `incoming-webhook` scope
- **Fix:** Verify webhook URL is correct

---

## 📊 Database Schema

### `interview_messages` table (Interviews DB):
- `question_text` - Interview question
- `answer_summary` - Expert response (KEY CONTENT)
- `expert_name` - Expert's name
- `expert_profile` - Background and credentials
- `credibility_score` - 0-10 expert credibility
- `consensus_score` - 0-10 agreement rating
- `meeting_id` - Groups Q&A from same interview

### `experts` table (Experts DB):
- `current_company` - Current employer
- `current_title` - Current role
- `recent_companies` - Array of recent employers
- `recent_titles` - Array of recent roles
- `searchable_text` - Rich background content (KEY FIELD)
- `linkedin_url` - LinkedIn profile

### Supabase Functions:
- `search_experts_company_role(p_companies, p_role_keywords, p_employment_status, p_limit)`

---

## 🚢 Deployment

### Render.com Setup:
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start:http`
- **Node Version:** 20 (set via `NODE_VERSION=20`)

### Environment Variables:
All secrets managed in Render dashboard (not in Git)

### Auto-Deploy:
Push to `main` branch → Render automatically deploys (~2-3 minutes)

---

## 📚 Documentation for Collaborators

**Start Here:**
1. `README.md` - System overview
2. `COLLABORATOR-GUIDE.md` - This guide
3. `USAGE-GUIDE.md` - How end users use it in ChatGPT

**For Specific Topics:**
- ChatGPT integration → `CHATGPT-INTEGRATION.md`
- Slack setup → `SLACK-INTEGRATION.md`
- HTTP API → `README-HTTP.md`
- Final status → `PROJECT-COMPLETE.md`

---

## 🎯 Key Design Decisions

### Why Direct Search for Insights?
- AI agent was over-processing queries
- Direct keyword search works better for interview content
- Faster (300-600ms vs 3-5s)
- More reliable results

### Why AI Agent for Expert Search?
- Natural language → company/role mapping is complex
- Users say "Big 5 firms" not "Korn Ferry, Russell Reynolds..."
- Worth 10-12s latency for accurate results
- Fallback patterns catch common cases when AI fails

### Why 2 Databases?
- Interviews and experts are managed separately
- Different access patterns and update frequencies
- Can scale independently

---

## 🤝 Contributing

### Code Style:
- TypeScript with strict mode
- ES Modules (not CommonJS)
- Zod for validation
- Async/await (no callbacks)

### Testing Changes:
1. Build locally: `npm run build`
2. Test endpoints manually
3. Check Render logs after deployment
4. Verify in ChatGPT

### Git Workflow:
- Main branch deploys to production
- Test thoroughly before pushing
- Use descriptive commit messages

---

## 📞 Support

**Production URL:** https://expert-platform-mcp-1.onrender.com  
**GitHub:** https://github.com/brenmarschner/expert-platform-mcp  
**Status:** All systems operational ✅

---

## 🎉 You're Ready!

The codebase is clean, documented, and ready for collaboration. Everything you need to understand, modify, and extend the system is here.

**Happy coding!** 🚀
