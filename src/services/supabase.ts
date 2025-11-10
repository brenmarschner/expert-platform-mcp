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
      // Extract key terms from verbose queries
      let searchTerms = params.questionTopic;
      
      // If query is too long (>50 chars), extract key terms
      if (searchTerms.length > 50) {
        // Remove parenthetical content like (EASM) first
        searchTerms = searchTerms.replace(/\([^)]*\)/g, ' ');
        
        // Remove common filler words and extract meaningful terms
        const fillerWords = ['interviews', 'with', 'customers', 'of', 'the', 'and', 'or', 'about', 'for', 'in', 'on', 'at', 'to', 'from', 'all', 'find', 'search', 'please', 'me', 'that', 'this', 'what', 'how', 'why', 'software', 'process'];
        const words = searchTerms.toLowerCase().split(/[\s,;.!?]+/);
        const keyWords = words.filter(word => 
          word.length > 3 && 
          !fillerWords.includes(word)
        );
        
        // Take first 3-4 meaningful words for focused search
        searchTerms = keyWords.slice(0, 4).join(' ');
        console.log(`Extracted key terms: "${params.questionTopic}" → "${searchTerms}"`);
      }
      
      // Sanitize the search term to prevent SQL injection
      const sanitizedTopic = searchTerms.replace(/[;'"\\]/g, ' ').trim();
      
      // Use OR search for flexibility - matches if ANY term is found
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

    const prompt = `You are a search query translator. Your ONLY job is to extract company names and job role keywords from user queries.

## CRITICAL RULES

1. **Extract ONLY company names** - exact company names mentioned or implied
2. **Extract ONLY job role keywords** - job titles, seniority levels, or functions mentioned
3. **Do NOT add companies not mentioned** in the query
4. **Do NOT add generic keywords** - only actual job titles/roles
5. **Return EXACTLY 5 search variations** to maximize coverage

## OUTPUT FORMAT (MUST MATCH EXACTLY)

\`\`\`json
{
  "searches": [
    {
      "companies": ["Exact", "Company", "Names"],
      "role_keywords": ["Job", "Title", "Keywords"],
      "employment_status": "current" or "former" or "any",
      "reasoning": "brief explanation"
    }
  ]
}
\`\`\`

## COMPANY EXTRACTION RULES

**Extract companies mentioned:**
- "former Insight Enterprises employees" → companies: ["Insight Enterprises", "Insight"]
- "current employees at CDW" → companies: ["CDW"]  
- "people from Google or Microsoft" → companies: ["Google", "Microsoft"]
- "Big 5" → companies: ["Korn Ferry", "Russell Reynolds", "Heidrick & Struggles", "Spencer Stuart", "Egon Zehnder"]
- "MBB" or "consulting" → companies: ["McKinsey", "Bain", "BCG"]

**Include company name variations:**
- "SHI" → ["SHI", "SHI International", "SHI International Corp"]
- "Insight" → ["Insight", "Insight Enterprises"]
- Always include 2-3 name variations for each company

## ROLE KEYWORD EXTRACTION RULES

**Extract ONLY roles/titles mentioned or implied:**
- "engineering experts" → role_keywords: ["Engineering", "Engineer", "Software Engineer"]
- "VPs" → role_keywords: ["VP", "Vice President"]
- "sales leaders" → role_keywords: ["Sales", "Account", "Business Development"]
- "IT resellers" → role_keywords: ["Sales", "Account Manager", "Solutions", "Services"]

**IMPORTANT:** If NO specific role is mentioned, use broad seniority levels:
- role_keywords: ["VP", "Director", "Manager", "Lead", "Senior"]

## EMPLOYMENT STATUS RULES

- "former" or "ex-" → employment_status: "former"
- "current" → employment_status: "current"  
- Both or neither → employment_status: "any"

## YOUR TASK

Extract companies and roles from this query: "${fullQuery}"

Generate **exactly 5 search variations** that cover:

**Search 1: All mentioned companies + broad roles**
- Include ALL companies from the query (with variations)
- Broad seniority: VP, Director, Manager, Senior, Lead

**Search 2: Primary companies + specific roles**
- Top 2-3 companies
- Specific role keywords from query

**Search 3: Company variations**
- Include name variations (CDW, SHI International Corp, etc.)
- Executive roles: VP, Director, Chief

**Search 4: All companies + mid-level roles**
- Same companies
- Manager, Senior, Specialist levels

**Search 5: Employment status focused**
- Same companies
- Match employment status from query (current/former/any)

## EXAMPLE

Query: "former Insight Enterprises employees or current employees at CDW, SHI"

Output:
\`\`\`json
{
  "searches": [
    {
      "companies": ["Insight Enterprises", "Insight", "CDW", "SHI", "SHI International"],
      "role_keywords": ["VP", "Director", "Manager", "Senior", "Lead"],
      "employment_status": "any",
      "reasoning": "All mentioned companies with broad seniority"
    },
    {
      "companies": ["CDW", "SHI"],
      "role_keywords": ["Sales", "Account", "Solutions"],
      "employment_status": "current",
      "reasoning": "Current employees at CDW/SHI in sales roles"
    },
    {
      "companies": ["Insight Enterprises", "Insight"],
      "role_keywords": ["VP", "Director"],
      "employment_status": "former",
      "reasoning": "Former Insight employees, senior levels"
    },
    {
      "companies": ["CDW", "SHI International", "SHI International Corp"],
      "role_keywords": ["Executive", "Vice President"],
      "employment_status": "current",
      "reasoning": "Company name variations for CDW/SHI"
    },
    {
      "companies": ["Insight", "CDW", "SHI"],
      "role_keywords": ["Manager", "Senior Manager"],
      "employment_status": "any",
      "reasoning": "Mid-level roles across all companies"
    }
  ]
}
\`\`\`

Now extract from: "${fullQuery}"

Return ONLY the JSON. No explanatory text.`;

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
            model: 'claude-sonnet-4-5',
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
    } else if (queryLower.includes('cdw') || queryLower.includes('shi') || queryLower.includes('insight enterprises') || queryLower.includes('it reseller')) {
      companies = ['CDW', 'SHI', 'SHI International', 'Insight Enterprises', 'Insight', 'Softchoice', 'Connection', 'PCM'];
      roleKeywords = ['VP', 'Vice President', 'Director', 'Manager', 'Sales', 'Account', 'Executive'];
    } else if (queryLower.includes('fintech')) {
      companies = ['Stripe', 'Square', 'PayPal', 'Plaid', 'Coinbase', 'Robinhood', 'Chime'];
      roleKeywords = ['VP', 'Director', 'Head', 'Lead', 'Senior', 'Chief', 'Executive'];
    } else if (queryLower.includes('tech') || queryLower.includes('google') || queryLower.includes('microsoft')) {
      companies = ['Google', 'Microsoft', 'Meta', 'Amazon', 'Apple', 'Netflix', 'Uber'];
      roleKeywords = ['VP', 'Director', 'Head', 'Lead', 'Senior', 'Principal', 'Manager', 'Engineering'];
    } else {
      // Generic fallback - extract company names and roles from query
      const words = query.split(/[\s,]+/);
      roleKeywords = words.filter(word => word.length > 2);
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
    // Use AI agent for accurate query interpretation
    const searches = await this.generateSearchQueries(
      params.query || '', 
      params.currentCompany, 
      params.currentTitle
    );
    
    // Use the first (best) search generated by AI
    const primarySearch = searches[0];
    const { data, error } = await this.expertsClient
      .rpc('search_experts_company_role', {
        p_companies: primarySearch.companies,
        p_role_keywords: primarySearch.role_keywords,
        p_employment_status: primarySearch.employment_status,
        p_limit: params.limit || 50
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
