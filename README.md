# Expert Platform MCP Server

AI-powered expert research platform integrated with ChatGPT Enterprise for investment diligence. Provides expert insights search, expert discovery, AI-powered synthesis, and Slack-integrated interview scheduling.

**🚀 Live Production:** https://expert-platform-mcp-1.onrender.com  
**📚 Quick Start:** See [COLLABORATOR-GUIDE.md](COLLABORATOR-GUIDE.md)  
**🤖 ChatGPT Setup:** See [CHATGPT-INTEGRATION.md](CHATGPT-INTEGRATION.md)

## Features

### 🔍 Interview Data Analysis
- **Search Interviews**: Query past interview messages by expert, project, topic, quality scores
- **Summarize Interviews**: Generate comprehensive summaries across single or multiple interviews  
- **Interview Insights**: Extract statistical insights and quality metrics from interview data
- **Expert History**: Get complete interview history for specific experts

### 👥 Expert Discovery & Management
- **Search Experts**: Find experts using your existing `search_experts_company_role` function
- **Expert Profiles**: Retrieve detailed expert information and availability status
- **Pool Analysis**: Analyze expert pool patterns, skills distribution, and trends

### 📋 Interview Creation & Requests
- **Create Interview Guides**: Build structured question sets with categorization and priorities
- **Generate Questions**: AI-powered question generation based on topics and expert backgrounds
- **Expert Sourcing**: Request new experts that match specific criteria
- **Launch Interviews**: Complete workflow from guide creation to team notification

### 🔔 Slack Integration
- Automatic notifications to your internal team for new interview requests
- Rich formatted messages with expert criteria, question previews, and action buttons
- Different urgency levels and request types

## Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   Create a `.env` file in the project root:
   ```bash
   # Required - Interview Data Project
   SUPABASE_INTERVIEWS_URL=https://your-interviews-project.supabase.co
   SUPABASE_INTERVIEWS_SERVICE_ROLE_KEY=your_interviews_service_role_key_here
   
   # Required - Expert Data Project
   SUPABASE_EXPERTS_URL=https://your-experts-project.supabase.co
   SUPABASE_EXPERTS_SERVICE_ROLE_KEY=your_experts_service_role_key_here
   
   # Required - Slack Integration
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
   
   # Optional - AI Features
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   # OR
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Run the Server**
   ```bash
   npm start
   ```

## Available MCP Tools

### Interview Tools
- `search_interviews` - Search and filter interview messages
- `summarize_interviews` - Generate comprehensive interview summaries
- `get_interview_insights` - Get statistical insights and quality metrics
- `get_expert_interview_history` - Get complete interview history for an expert

### Expert Tools
- `search_experts` - Search for experts using existing database function
- `get_expert_profile` - Get detailed expert profile by ID
- `get_expert_availability` - Check expert availability and scheduling status
- `analyze_expert_pool` - Analyze expert pool patterns and trends

### Request Tools
- `create_interview_guide` - Create structured interview guides with Slack notification
- `generate_interview_questions` - Generate AI-powered interview questions
- `request_expert_sourcing` - Request sourcing of new experts with Slack notification
- `launch_interview_request` - Complete interview request workflow

## Usage Examples

### Finding Past Interview Insights
```json
{
  "tool": "search_interviews",
  "arguments": {
    "questionTopic": "fintech regulatory challenges",
    "minConsensusScore": 7,
    "limit": 10
  }
}
```

### Discovering Experts
```json
{
  "tool": "search_experts", 
  "arguments": {
    "query": "blockchain payments",
    "currentCompany": "Stripe",
    "limit": 5
  }
}
```

### Creating Interview Requests
```json
{
  "tool": "launch_interview_request",
  "arguments": {
    "interviewGuide": {
      "title": "Fintech Payment Processing Deep Dive",
      "description": "Understanding current challenges and innovations in payment processing",
      "questions": [
        {
          "question": "What are the biggest technical challenges in payment processing today?",
          "category": "technical", 
          "priority": "high"
        }
      ],
      "expertCriteria": {
        "currentTitle": "Head of Payments",
        "recentCompanies": ["Stripe", "Square", "PayPal"],
        "experienceYears": 8
      }
    },
    "urgency": "high"
  }
}
```

## Database Schema Requirements

The server connects to two separate Supabase projects:

**Interview Data Project:**
- `interview_messages` - Interview Q&A data with quality scores

**Expert Data Project:**  
- `experts` - Expert profiles and availability information
- `search_experts_company_role()` - Existing function for expert search

## Development

- **Watch Mode**: `npm run dev`
- **Build**: `npm run build`  
- **Start**: `npm start`

## Architecture

```
src/
├── index.ts              # MCP server entry point
├── config/
│   └── environment.ts    # Environment variable validation
├── services/
│   ├── supabase.ts      # Database queries and operations
│   └── slack.ts         # Slack webhook notifications
├── tools/
│   ├── interviews.ts    # Interview data analysis tools
│   ├── experts.ts       # Expert discovery and management tools
│   └── requests.ts      # Interview creation and request tools
├── types/
│   └── schema.ts        # TypeScript interfaces
└── utils/
    └── validation.ts    # Input validation schemas
```

## Error Handling

The server includes comprehensive error handling:
- Input validation using Zod schemas
- Database connection error handling
- Slack webhook failure handling  
- Graceful degradation for missing data

## Security

- Uses Supabase service role key for full database access
- Environment variable validation on startup
- Input sanitization and validation
- Error message sanitization to prevent data leakage
