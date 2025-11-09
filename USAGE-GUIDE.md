# Expert Platform - ChatGPT Usage Guide

## 🎯 What You Can Do

Your Expert Platform connected to ChatGPT provides powerful investment diligence capabilities:

1. **Search Expert Insights** - Find what industry leaders think about business topics
2. **Synthesize Research** - AI-powered analysis across multiple expert interviews
3. **Discover Experts** - Find current/former employees of target companies
4. **Generate Research Questions** - Create interview guides for new research
5. **Access Full Interviews** - Get complete interview transcripts

---

## 🔍 Tool 1: search_insights

**Purpose:** Find expert opinions on business topics

**Best For:**
- Investment diligence research
- Market dynamics understanding
- Competitive landscape analysis
- Business strategy insights

**Example Queries:**
```
"vendor consolidation"
"budget allocation strategies"
"executive search trends"
"competitive dynamics"
"pricing strategy"
"market trends"
```

**What You Get:**
- Expert quotes with full context
- Expert profiles and credentials
- Credibility scores (0-10)
- Source questions and dates

**Sample Result:**
> *"In enterprises, vendor consolidation predominates: they typically favor a 'good-enough' capability from their primary platform over superior standalone tools..."*
> 
> **Aaron Birnbaum**, Chief at TRaViS  
> Credibility: 9/10

---

## 🧠 Tool 2: synthesize_insights (NEW!)

**Purpose:** AI-powered synthesis of expert opinions for investment analysis

**Best For:**
- Due diligence reports
- Market research summaries
- Consensus identification
- Investment decision support

**Example Queries:**
```
"Synthesize insights on vendor consolidation"
"What's the expert consensus on pricing strategies?"
"Analyze opinions about market dynamics in fintech"
```

**What You Get:**
- **Executive Summary**: Key takeaways
- **Key Findings**: 3-5 actionable insights
- **Consensus Analysis**: Where experts agree
- **Disagreement Analysis**: Differing perspectives
- **Credibility Assessment**: Quality of sources
- **Investment Implications**: What investors should know
- **Source Interviews**: All underlying expert quotes

**Features:**
- Credibility-weighted analysis (high-credibility experts weighted more)
- Identifies patterns across multiple interviews
- Investment-focused recommendations
- Quality scored findings

---

## 👥 Tool 3: search_experts

**Purpose:** Find current and former employees of specific companies

**Best For:**
- Sourcing interview candidates
- Finding industry specialists
- Identifying former employees for unbiased perspectives

**Works Best With:**
- **Specific companies**: "Google", "Korn Ferry", "Microsoft"
- **Known patterns**: "Big 5", "consulting firms", "tech giants"
- **Company + role**: "engineering at Google", "executives from Korn Ferry"

**Example Queries:**
```
"Big 5 search firms" → Finds Partners, Directors at Korn Ferry, Russell Reynolds, etc.
"engineering at Google" → Finds Google engineers
"former McKinsey consultants" → Finds ex-McKinsey professionals
"cybersecurity executives at Microsoft" → Finds Microsoft security leaders
```

**What You Get:**
- Full names and LinkedIn profiles
- Current company and title
- Recent companies and roles
- Contact information (when available)
- Location

**Note:** Works best with specific company names. Generic industry queries ("fintech experts") may require the AI agent to infer companies.

---

## ❓ Tool 4: generate_questions

**Purpose:** Create interview questions for research topics

**Example Queries:**
```
"Generate 10 questions about executive search trends"
"Create interview guide for fintech executives"  
"Questions about AI adoption challenges"
```

**What You Get:**
- 5-25 questions categorized by type
- Background, technical, opinion, scenario questions
- Priority levels (high, medium, low)
- Follow-up question suggestions

---

## 👤 Tool 5: fetch_profile

**Purpose:** Get detailed expert background

**Example Queries:**
```
"Get profile for Adam Ortiz"
"Fetch details about Rudy Alanis"
```

**What You Get:**
- Complete work history
- LinkedIn profile
- Current and recent positions
- Contact information
- Expertise areas

---

## 📄 Tool 6: get_full_interview

**Purpose:** Access complete interview transcripts

**Example Usage:**
```
"Get full interview for meeting 98302656417"
```

**What You Get:**
- All questions and answers (chronological)
- Expert profile and credentials
- Quality metrics for the interview
- Overall credibility and consensus scores
- Complete context for any quote

---

## 💡 Best Practices

### For Expert Discovery:

**✅ DO:**
- Include specific company names: *"executives from Korn Ferry"*
- Use known patterns: *"Big 5 search firms"*, *"consulting firms"*
- Combine company + role: *"engineering at Google"*
- Specify current/former: *"former Google employees"*

**❌ AVOID:**
- Generic industry only: *"fintech experts"* (unless you accept AI inference)
- Vague roles without companies: *"product managers"*

### For Insight Research:

**✅ DO:**
- Use business terminology: *"vendor consolidation"*, *"competitive dynamics"*
- Be specific about topics: *"pricing strategy"*, *"market trends"*
- Ask about decisions/strategies: *"budget allocation"*, *"vendor selection"*

**❌ AVOID:**
- Overly complex natural language if simple terms work better

### For Synthesis:

**✅ DO:**
- Use for investment research: *"Synthesize insights on vendor consolidation"*
- Request consensus analysis: *"What do experts agree on about pricing?"*
- Filter by credibility: Set minCredibilityScore to 7-9 for best quality

---

## 📊 Understanding Quality Scores

### Credibility Score (0-10):
- **9-10**: Highly credible - direct experience, proven expertise
- **7-8**: Credible - relevant experience, good knowledge
- **5-6**: Moderate - some relevant experience
- **<5**: Limited credibility for this topic

### Consensus Score (0-10):
- **7-10**: Strong agreement with known facts/research
- **4-6**: Moderate alignment
- **0-3**: Diverges from consensus or limited validation

**Tip:** For synthesis, use minCredibilityScore: 7 to ensure high-quality sources

---

## 🎯 Real-World Examples

### Investment Diligence Workflow:

1. **Research a Topic:**
   ```
   "Search for insights about vendor consolidation in enterprise software"
   ```

2. **Synthesize Findings:**
   ```
   "Synthesize insights on vendor consolidation with credibility 8+"
   ```
   → Gets: Executive summary, consensus analysis, investment implications

3. **Find Subject Matter Experts:**
   ```
   "Find former executives from leading enterprise software companies"
   ```

4. **Generate Follow-up Questions:**
   ```
   "Generate 10 questions about vendor consolidation strategies"
   ```

5. **Access Full Context:**
   ```
   "Get full interview for meeting [ID from search results]"
   ```

---

## 🚀 Advanced Usage

### Compound Research:

Ask ChatGPT to combine tools:
```
"Search for insights about pricing strategies, then synthesize the findings, 
and generate follow-up questions for interviewing pricing executives"
```

ChatGPT will:
1. Use `search_insights` to find expert opinions
2. Use `synthesize_insights` to create analysis
3. Use `generate_questions` to create interview guide

### Cross-Reference:

```
"Find experts who have insights about vendor consolidation, 
then get their full profiles"
```

ChatGPT will:
1. Search insights to identify experts
2. Fetch their detailed profiles
3. Provide complete context

---

## ⚡ Current Capabilities

**✅ Working Excellently:**
- Insight search (300-600ms response)
- Full interview retrieval
- Question generation
- Big 5 / consulting firm expert discovery
- AI-powered synthesis

**✅ Working (with considerations):**
- Expert search with AI agent (10-12 seconds, but accurate)
- Generic industry queries (depends on AI agent inference)

**🔄 Optimized For:**
- Investment diligence research
- Expert interview sourcing
- Market and competitive intelligence
- Strategic decision research

---

## 📝 Tips for Best Results

1. **Start Broad, Then Narrow:**
   - First: *"Search for insights about vendor trends"*
   - Then: *"Synthesize insights on vendor consolidation specifically"*

2. **Use Credibility Filters:**
   - For critical research: `minCredibilityScore: 8`
   - For comprehensive view: `minCredibilityScore: 5`

3. **Leverage Full Interviews:**
   - Find an interesting quote
   - Get the meeting_id from results
   - Request full interview for complete context

4. **Combine Tools:**
   - Let ChatGPT use multiple tools to answer complex questions
   - It will automatically chain: search → synthesize → generate questions

---

## 🎉 You're Ready!

Your Expert Platform gives ChatGPT access to:
- **Real expert insights** from industry leaders
- **AI-powered synthesis** for investment analysis
- **Expert discovery** for interview sourcing
- **Complete interview access** for full context

This is a powerful research assistant for investment diligence and market intelligence!
