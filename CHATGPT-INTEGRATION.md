# ChatGPT MCP Connector - Expert Platform Integration Guide

## 🎯 Overview

Your Expert Platform is now fully integrated with ChatGPT through the Model Context Protocol (MCP), providing AI-powered access to expert interviews and profiles for investment diligence research.

## 🚀 Live API

**URL:** https://expert-platform-mcp-1.onrender.com

**MCP Endpoint:** https://expert-platform-mcp-1.onrender.com/mcp

## 🛠️ Available MCP Tools

### 1. `search_insights`
**Purpose:** Find expert opinions on business topics for investment diligence

**Use Cases:**
- Market dynamics research
- Competitive landscape analysis
- Business strategy insights
- Operational challenges and risks

**Example Queries:**
- *"vendor consolidation"*
- *"executive search trends"*
- *"budget allocation strategies"*

**Returns:** Expert quotes with full profiles and credibility scores (0-10)

### 2. `search_experts`
**Purpose:** Find current and former employees of specific companies

**Use Cases:**
- Source experts for interviews
- Find industry specialists
- Identify former employees of target companies

**Example Queries:**
- *"executives from Big 5 search firms"*
- *"former Google product managers"*
- *"current Stripe executives"*

**Returns:** Expert profiles with LinkedIn, company history, and current roles

**How It Works:** AI-powered search converts natural language to company/role combinations. Smart fallbacks for common patterns like "Big 5", "consulting", "fintech", "tech giants".

### 3. `generate_questions`
**Purpose:** Create interview questions for research topics

**Example Usage:**
- *"Generate questions about executive search trends"*
- *"Create interview guide for fintech executives"*

**Returns:** 5-25 categorized questions with follow-up suggestions

### 4. `fetch_profile`
**Purpose:** Get detailed expert background by ID or name

**Example Usage:**
- *"Get profile for Rudy Alanis"*
- *"Fetch expert details for ID abc-123"*

**Returns:** Complete expert profile with work history and credentials

### 5. `get_full_interview`
**Purpose:** Retrieve complete interview transcripts by meeting ID

**Example Usage:**
- *"Get full interview for meeting 98302656417"*

**Returns:** All Q&A from the interview session with quality metrics

## 📋 ChatGPT Connector Setup

### Configuration:

**Name:** `Expert Platform`

**Description:** 
```
Search expert interviews for investment diligence insights. Find current and former employees of target companies. Access real expert opinions with credibility scores from industry leaders.
```

**MCP Server URL:** `https://expert-platform-mcp-1.onrender.com/mcp`

**Authentication:** OAuth (leave credentials empty for now)

## 🧪 Test Queries for ChatGPT

Once connected, try these:

### Investment Diligence Insights:
- *"Search for insights about vendor consolidation strategies"*
- *"What do experts think about budget allocation in executive search?"*
- *"Find opinions on insourcing vs outsourcing decisions"*

### Expert Discovery:
- *"Find 10 executives from Big 5 search firms"*
- *"Search for former Google engineering leaders"*  
- *"Find current executives at Korn Ferry or Russell Reynolds"*

### Research Tools:
- *"Generate 10 interview questions about AI adoption in healthcare"*
- *"Get the complete interview for meeting 98302656417"*

## 💡 What Makes This Powerful

### Real Expert Insights:
Every insight includes:
- **Actual expert quote** (answer_summary)
- **Expert credentials** (name, current position, background)
- **Credibility score** (0-10 rating)
- **Consensus score** (0-10 agreement rating)
- **Source context** (question asked, project, date)

### Example Insight:
> *"Would consolidate spend with fewer vendors if a partner offers an integrated, end-to-end solution beyond talent, connecting capex and workforce investment to commercial execution..."*
> 
> **Rudy Alanis**, CHRO at Fruit of the Loom  
> Credibility: 9/10 | Consensus: 3/10

### Expert Discovery:
Find people with specific experience:
- **10 Big 5 search firm executives** (Partners, Principals, Directors)
- **Former employees** of target companies
- **Current employees** by role and location

## 🔧 Technical Architecture

### Dual Protocol Support:
- **HTTP REST API:** All 12 endpoints at `/api/*`
- **MCP Protocol:** ChatGPT connector at `/mcp`

### Databases:
- **Interviews:** Supabase (https://sazkrggdyfkdzdqcsiuo.supabase.co)
- **Experts:** Supabase (https://fgbctkcdpwexbuyuuosi.supabase.co)

### AI-Powered Search:
- **Expert Search:** Claude Sonnet 4.5 converts queries to strategic company/role searches
- **Smart Fallbacks:** Pattern detection for Big 5, consulting, fintech, tech
- **Direct Search:** Interview insights use direct term matching for reliability

## 📊 Data Quality

### Interview Database:
- **Rich expert profiles** with credentials and expertise
- **Quality scored responses** (credibility, consensus, completion)
- **Full context** (questions, answers, expert backgrounds)

### Expert Database:
- **Current and former positions**
- **LinkedIn profiles and contact info**
- **Recent company and title history**
- **Searchable across 50+ fields**

## 🎯 Best Practices

### For Best Results:

**Insights Search:**
- Use business terminology (strategy, market, competitive, risk)
- Be specific about topics (vendor consolidation, not just "vendors")
- Focus on decision-making and evaluation criteria

**Expert Search:**
- **Include company names** when possible
- Use "Big 5", "consulting", "tech" for common patterns
- Specify current vs former if relevant

## 🔄 Maintenance

### Environment Variables (Render):
```
NODE_VERSION=20
SUPABASE_INTERVIEWS_URL=https://sazkrggdyfkdzdqcsiuo.supabase.co
SUPABASE_INTERVIEWS_SERVICE_ROLE_KEY=[service_role_key]
SUPABASE_EXPERTS_URL=https://fgbctkcdpwexbuyuuosi.supabase.co
SUPABASE_EXPERTS_SERVICE_ROLE_KEY=[service_role_key]
SLACK_WEBHOOK_URL=[placeholder]
ANTHROPIC_API_KEY=[your_key]
```

### Deployment:
- **Auto-deploy:** Pushes to `main` branch trigger Render deployment
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run start:http`

## 🚧 Known Limitations

1. **Expert Search:** Requires specific companies/roles for best results. Generic queries like "fintech experts" may return 0 results if AI agent can't match to database companies.

2. **Insights Search:** Works with direct term matching. Complex queries benefit from simpler, focused keywords.

3. **AI Agent:** Expert search uses Claude Sonnet 4.5 to generate company/role combinations. Falls back to smart patterns when AI fails.

## 📈 Future Enhancements

- Add authentication for production use
- Implement rate limiting
- Add caching for common queries
- Expand smart fallback patterns
- Monitor AI agent performance and refine prompts

## 🎉 Success!

Your Expert Platform now provides ChatGPT users with:
- **Real expert insights** from industry leaders
- **Targeted expert discovery** for research and interviews
- **Complete interview transcripts** with quality metrics
- **AI-powered question generation** for new research

This is a powerful tool for investment diligence, market research, and expert network development!
