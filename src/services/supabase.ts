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
    // Create an AI agent to convert natural language to effective interview search terms
    const prompt = `You are an expert at converting natural language queries into effective search terms for finding expert interview insights.

Your task: Convert the user's natural language query into 2-3 focused search terms that will find relevant expert interviews.

EXAMPLES:

User: "What do executives think about vendor consolidation?"
Output: "vendor consolidation executive decision"

User: "How do CHROs allocate executive search budgets?"  
Output: "budget allocation executive search CHRO"

User: "What are trends in AI adoption?"
Output: "AI adoption trends technology"

User: "How do companies decide on insourcing vs outsourcing?"
Output: "insourcing outsourcing decision strategy"

User: "What drives executive search firm selection?"
Output: "executive search firm selection criteria"

RULES:
- Return 3-6 key search terms separated by spaces
- BE AGGRESSIVE - include multiple related concepts and synonyms
- Include the main topic/concept AND related terms
- Include relevant role titles if mentioned (CEO, CHRO, VP, Director, Chief, Executive, etc.)
- Include action words (decision, allocation, strategy, trends, approach, process, etc.)
- Include industry terms and variations
- Include both formal and informal terms
- Cast a WIDE NET - better to include more terms than miss relevant content

EXAMPLES OF AGGRESSIVE SEARCH:
"What do executives think about vendor consolidation?" → "vendor consolidation executive decision strategy procurement sourcing"
"How do CHROs manage budgets?" → "CHRO budget management allocation spending strategy HR"
"AI adoption trends" → "AI adoption trends artificial intelligence technology implementation strategy"

Convert this query: "${query}"

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

Generate **exactly 5 diverse search queries** with this strategy:

**Search 1: Broad company list, specific senior roles**
- 4-5 major companies from the industry
- 1-2 senior role keywords (VP, Director, Chief)
- Employment status: 'any'

**Search 2: Top companies, broad roles**
- 2-3 most relevant companies
- 2-3 related role keywords
- Employment status: 'current'

**Search 3: Company name variations, specific seniority**
- 2-4 companies with name variations (e.g., "Intel", "Intel Corporation", "Intel Foundry")
- Seniority keywords (VP, Director, Chief)
- Employment status: 'current'

**Search 4: Secondary/niche companies, functional roles**
- 2-3 smaller or adjacent companies
- 2-3 functional keywords
- Employment status: 'any'

**Search 5: Competitor companies, executive level**
- 2-3 competitor companies
- Executive-level keywords only (Chief, VP, C-level)
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
