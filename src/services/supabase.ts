import { createClient } from '@supabase/supabase-js';
import { env } from '../config/environment.js';
import type { InterviewMessage, Expert } from '../types/schema.js';
import type { InterviewSearchInput, ExpertSearchInput } from '../utils/validation.js';

export class SupabaseService {
  private interviewsClient;
  private expertsClient;

  constructor() {
    // Client for interview data
    this.interviewsClient = createClient(env.supabaseInterviewsUrl, env.supabaseInterviewsServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Client for expert data
    this.expertsClient = createClient(env.supabaseExpertsUrl, env.supabaseExpertsServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  async searchInterviews(params: InterviewSearchInput): Promise<InterviewMessage[]> {
    let query = this.interviewsClient
      .from('interview_messages')
      .select('*');

    // Apply filters
    if (params.expertName) {
      query = query.ilike('expert_name', `%${params.expertName}%`);
    }

    if (params.projectId) {
      query = query.eq('project_id', params.projectId);
    }

    if (params.questionTopic) {
      let searchTerms = params.questionTopic;
      
      try {
        // Try AI agent first
        searchTerms = await this.generateInsightSearchQuery(params.questionTopic);
        console.log(`AI insights agent converted: "${params.questionTopic}" → "${searchTerms}"`);
      } catch (error) {
        console.warn('AI insights agent failed, using original query:', error);
        searchTerms = params.questionTopic;
      }
      
      // If AI agent returns empty or very short result, use original + enhanced terms
      if (!searchTerms || searchTerms.length < 5) {
        const queryLower = params.questionTopic.toLowerCase();
        const additionalTerms: string[] = [];
        
        if (queryLower.includes('vendor') || queryLower.includes('consolidat')) {
          additionalTerms.push('vendor', 'consolidation', 'procurement', 'sourcing', 'supplier');
        }
        if (queryLower.includes('budget') || queryLower.includes('allocat')) {
          additionalTerms.push('budget', 'allocation', 'spending', 'investment', 'cost');
        }
        if (queryLower.includes('executive search') || queryLower.includes('recruiting')) {
          additionalTerms.push('executive search', 'recruiting', 'hiring', 'talent', 'search firm');
        }
        
        searchTerms = `${params.questionTopic} ${additionalTerms.join(' ')}`.trim();
        console.log(`Enhanced search terms: "${searchTerms}"`);
      }
      
      // Sanitize the search term to prevent SQL injection and parsing errors
      const sanitizedTopic = searchTerms.replace(/[;'"\\]/g, ' ').trim();
      query = query.or(`question_text.ilike.%${sanitizedTopic}%,answer_summary.ilike.%${sanitizedTopic}%`);
    }

    if (params.dateFrom) {
      query = query.gte('created_at', params.dateFrom);
    }

    if (params.dateTo) {
      query = query.lte('created_at', params.dateTo);
    }

    if (params.minConsensusScore) {
      query = query.gte('consensus_score', params.minConsensusScore);
    }

    if (params.minCredibilityScore) {
      query = query.gte('credibility_score', params.minCredibilityScore);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(params.limit);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to search interviews: ${error.message}`);
    }

    return data || [];
  }

  async getFullInterview(meetingId: string): Promise<InterviewMessage[]> {
    const { data, error } = await this.interviewsClient
      .from('interview_messages')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get full interview: ${error.message}`);
    }

    return data || [];
  }

  private async generateInsightSearchQuery(query: string): Promise<string> {
    // AI agent optimized for investment diligence research queries
    const prompt = `You are an expert at converting investment diligence questions into effective search terms for finding expert interview insights.

FOCUS: Investment diligence research - market dynamics, competitive landscape, business strategy, operational challenges, growth drivers, risks, and industry trends.

Your task: Convert the user's diligence question into 3-5 focused search terms that will find relevant expert insights.

INVESTMENT DILIGENCE EXAMPLES:

User: "What are the competitive dynamics in the fintech payments space?"
Output: "competitive dynamics fintech payments market"

User: "How do companies evaluate build vs buy decisions for AI?"
Output: "build buy decision AI technology strategy"

User: "What are the key risks in SaaS customer acquisition?"
Output: "SaaS customer acquisition risks challenges"

User: "How do executives think about pricing strategy in B2B software?"
Output: "pricing strategy B2B software executive"

User: "What drives vendor selection in enterprise security?"
Output: "vendor selection enterprise security procurement"

User: "How do companies approach digital transformation initiatives?"
Output: "digital transformation strategy implementation"

User: "What are the growth challenges in healthcare technology?"
Output: "growth challenges healthcare technology"

RULES FOR DILIGENCE RESEARCH:
- Focus on business strategy, market dynamics, competitive positioning
- Include decision-making processes and evaluation criteria  
- Include risk factors, challenges, and growth drivers
- Include market trends, disruption, and industry evolution
- Include operational aspects like pricing, go-to-market, customer acquisition
- Use business terminology that executives would discuss
- Return 3-5 key terms separated by spaces

Convert this diligence query: "${query}"

Return only the search terms, nothing else.`;

    try {
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (anthropicKey) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 100,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (response.ok) {
          const result = await response.json();
          const searchTerms = result.content[0].text.trim();
          return searchTerms;
        }
      }
    } catch (error) {
      console.warn('Insights search agent failed, using original query:', error);
    }

    // Fallback: return original query
    return query;
  }

  private async generateSearchQueries(query: string, currentCompany?: string, currentTitle?: string): Promise<Array<{
    companies: string[];
    role_keywords: string[];
    employment_status: 'current' | 'former' | 'any';
    reasoning: string;
  }>> {
    // Build the full query including explicit parameters
    let fullQuery = query;
    if (currentCompany) {
      fullQuery += ` at ${currentCompany}`;
    }
    if (currentTitle) {
      fullQuery += ` ${currentTitle}`;
    }

    const prompt = `You are an expert search query generator for a company and role-based search system.

## CRITICAL OUTPUT FORMAT REQUIREMENT

**YOU MUST RETURN EXACTLY THIS JSON STRUCTURE:**
\`\`\`json
{
  "searches": [
    {
      "companies": ["GlobalFoundries", "Intel Foundry"],
      "role_keywords": ["VP", "Director"],
      "employment_status": "current",
      "reasoning": "Example reasoning"
    },
    {
      "companies": ["Samsung", "TSMC"],
      "role_keywords": ["procurement"],
      "employment_status": "any",
      "reasoning": "Example reasoning"
    }
  ]
}
\`\`\`

**RULES:**
- ✅ ALWAYS return exactly 5 separate search objects in the "searches" array
- ✅ Each search must have: companies (array), role_keywords (array), employment_status (string), reasoning (string)
- ❌ DO NOT return a single search with all companies combined
- ❌ DO NOT put companies or role_keywords at root level
- ❌ DO NOT return more or less than 5 searches

## SEARCH SYSTEM OVERVIEW

The system searches LinkedIn profiles based on:
- **Companies** (highest priority - 40 points)
- **Role keywords** (titles like VP, Director, CISO - 30 points)
- **Recency** (last 5 years - 30 points)
- **Employment status** (current, former, or any)

## YOUR TASK

FOCUS: Finding current and former employees of specific companies with relevant role experience.

Generate **exactly 5 diverse search queries** optimized for company + role targeting:

**Search 1: Target companies, broad seniority levels**
- 3-4 most relevant companies from the query
- Wide range of seniority: VP, Director, Senior Director, Managing Director, Head, Lead, Senior, Principal
- Employment status: 'any'

**Search 2: Target companies, specific functional roles**
- 2-3 most relevant companies
- Functional role keywords based on query context
- Employment status: 'current'

**Search 3: Company variations and subsidiaries**
- Include company name variations, subsidiaries, former names
- Executive-level roles: Chief, VP, C-level, President
- Employment status: 'current'

**Search 4: Adjacent/competitor companies**
- 2-3 competitor or related companies in same industry
- Mid-level roles: Manager, Senior Manager, Director
- Employment status: 'any'

**Search 5: Former employees strategy**
- Same target companies as Search 1
- Senior roles only: VP, Director, Chief, Head
- Employment status: 'former' (find people who left)

**SPECIAL HANDLING:**
- If query mentions "Big 5" or "executive search firms": Use ["Korn Ferry", "Russell Reynolds", "Heidrick & Struggles", "Spencer Stuart", "Egon Zehnder", "Korn Ferry International", "Russell Reynolds Associates"]
- If query mentions "consulting": Use ["McKinsey", "Bain", "BCG", "Deloitte", "PwC", "EY", "KPMG"]
- If query mentions "tech giants": Use ["Google", "Microsoft", "Meta", "Amazon", "Apple"]
- If query mentions "fintech": Use ["Stripe", "Square", "PayPal", "Plaid", "Coinbase"]

**BE EXTREMELY AGGRESSIVE WITH ROLE KEYWORDS:**
- Include ALL possible variations: "VP", "Vice President", "Director", "Senior Director", "Managing Director", "Chief", "Head", "Lead", "Senior", "Principal", "Manager", "Senior Manager"
- For executive search firms specifically: "Partner", "Principal", "Managing Director", "Executive Recruiter", "Senior Associate", "Associate", "Consultant", "Senior Consultant", "Practice Leader"
- For any industry: Include functional titles like "Engineering", "Product", "Sales", "Marketing", "Operations", "Finance", "Strategy", "Business Development"
- Cast a WIDE NET - better to include too many role keywords than too few

**BE AGGRESSIVE WITH COMPANY VARIATIONS:**
- Include full legal names, shortened names, and common variations
- For each company, include 2-3 name variations
- Include subsidiary and division names where relevant

Generate searches for: "${fullQuery}"

Return ONLY valid JSON in the exact format shown above. No explanatory text before or after. Just the JSON.`;

    try {
      // Use Anthropic API if available
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      if (anthropicKey) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (response.ok) {
          const result = await response.json();
          const content = result.content[0].text;
          const parsed = JSON.parse(content);
          return parsed.searches;
        }
      }
    } catch (error) {
      console.warn('AI agent failed, using fallback:', error);
    }

    // Enhanced fallback: smart detection for common patterns
    let companies: string[] = [];
    let roleKeywords: string[] = [];
    
    if (currentCompany) companies.push(currentCompany);
    if (currentTitle) roleKeywords.push(currentTitle);
    
    const queryLower = query.toLowerCase();
    
    // Smart pattern detection
    if (queryLower.includes('big 5') || queryLower.includes('executive search firm')) {
      companies = ['Korn Ferry', 'Russell Reynolds', 'Heidrick & Struggles', 'Spencer Stuart', 'Egon Zehnder'];
      roleKeywords = ['Partner', 'Principal', 'Director', 'VP', 'Executive Recruiter', 'Managing Director', 'Senior Associate'];
    } else if (queryLower.includes('consulting')) {
      companies = ['McKinsey', 'Bain', 'BCG', 'Deloitte', 'PwC', 'EY', 'KPMG'];
      roleKeywords = ['Partner', 'Principal', 'Director', 'VP', 'Manager', 'Senior Manager'];
    } else if (queryLower.includes('fintech')) {
      companies = ['Stripe', 'Square', 'PayPal', 'Plaid', 'Coinbase', 'Robinhood', 'Chime'];
      roleKeywords = ['VP', 'Director', 'Head', 'Lead', 'Senior', 'Chief', 'Executive'];
    } else if (queryLower.includes('tech') || queryLower.includes('google') || queryLower.includes('microsoft')) {
      companies = ['Google', 'Microsoft', 'Meta', 'Amazon', 'Apple', 'Netflix', 'Uber'];
      roleKeywords = ['VP', 'Director', 'Head', 'Lead', 'Senior', 'Principal', 'Manager', 'Engineering'];
    } else {
      // Generic fallback
      roleKeywords = query.split(' ').filter(word => word.length > 2);
    }
    
    console.log(`Expert search fallback - Query: ${query}, Companies: ${companies.join(',')}, Roles: ${roleKeywords.join(',')}`);
    
    return [{
      companies,
      role_keywords: roleKeywords,
      employment_status: 'any' as const,
      reasoning: 'Smart fallback search with pattern detection'
    }];
  }

  async getExpertInterviewHistory(expertId: number): Promise<InterviewMessage[]> {
    const { data, error } = await this.interviewsClient
      .from('interview_messages')
      .select('*')
      .eq('expert_id', expertId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get expert interview history: ${error.message}`);
    }

    return data || [];
  }

  async searchExperts(params: ExpertSearchInput): Promise<Expert[]> {
    // Use AI agent to generate strategic search, but only use the first one
    const searches = await this.generateSearchQueries(
      params.query || '', 
      params.currentCompany, 
      params.currentTitle
    );
    
    // Use the first (best) search with higher limit
    const primarySearch = searches[0];
    const { data, error } = await this.expertsClient
      .rpc('search_experts_company_role', {
        p_companies: primarySearch.companies,
        p_role_keywords: primarySearch.role_keywords,
        p_employment_status: primarySearch.employment_status,
        p_limit: params.limit || 50  // Return more results
      });

    if (error) {
      throw new Error(`Failed to search experts: ${error.message}`);
    }

    return data || [];
  }

  async getExpertProfile(expertId: string): Promise<Expert | null> {
    const { data, error } = await this.expertsClient
      .from('experts')
      .select('*')
      .eq('id', expertId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Expert not found
      }
      throw new Error(`Failed to get expert profile: ${error.message}`);
    }

    return data;
  }

  async getInterviewInsights(params: InterviewSearchInput): Promise<{
    totalInterviews: number;
    averageConsensusScore: number;
    averageCredibilityScore: number;
    averageCompletionScore: number;
    topExperts: Array<{ expert_name: string; interview_count: number; avg_consensus: number }>;
  }> {
    const interviews = await this.searchInterviews(params);

    if (interviews.length === 0) {
      return {
        totalInterviews: 0,
        averageConsensusScore: 0,
        averageCredibilityScore: 0,
        averageCompletionScore: 0,
        topExperts: []
      };
    }

    // Calculate averages
    const validConsensusScores = interviews.filter(i => i.consensus_score !== null).map(i => i.consensus_score!);
    const validCredibilityScores = interviews.filter(i => i.credibility_score !== null).map(i => i.credibility_score!);
    const validCompletionScores = interviews.filter(i => i.completion_score !== null).map(i => i.completion_score!);

    const averageConsensusScore = validConsensusScores.length > 0 
      ? validConsensusScores.reduce((a, b) => a + b, 0) / validConsensusScores.length 
      : 0;

    const averageCredibilityScore = validCredibilityScores.length > 0 
      ? validCredibilityScores.reduce((a, b) => a + b, 0) / validCredibilityScores.length 
      : 0;

    const averageCompletionScore = validCompletionScores.length > 0 
      ? validCompletionScores.reduce((a, b) => a + b, 0) / validCompletionScores.length 
      : 0;

    // Calculate top experts
    const expertStats = new Map<string, { count: number; totalConsensus: number }>();
    
    interviews.forEach(interview => {
      if (interview.expert_name && interview.consensus_score !== null) {
        const current = expertStats.get(interview.expert_name) || { count: 0, totalConsensus: 0 };
        expertStats.set(interview.expert_name, {
          count: current.count + 1,
          totalConsensus: current.totalConsensus + interview.consensus_score
        });
      }
    });

    const topExperts = Array.from(expertStats.entries())
      .map(([name, stats]) => ({
        expert_name: name,
        interview_count: stats.count,
        avg_consensus: stats.totalConsensus / stats.count
      }))
      .sort((a, b) => b.avg_consensus - a.avg_consensus)
      .slice(0, 10);

    return {
      totalInterviews: interviews.length,
      averageConsensusScore,
      averageCredibilityScore,
      averageCompletionScore,
      topExperts
    };
  }
}
