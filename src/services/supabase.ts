import { createClient } from '@supabase/supabase-js';
import { env } from '../config/environment.js';
import type { InterviewMessage, Expert } from '../types/schema.js';
import type { InterviewSearchInput, ExpertSearchInput } from '../utils/validation.js';

// Generate semantic search terms using AI
async function generateSemanticSearchTerms(query: string): Promise<string> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  
  if (!anthropicKey) {
    return query; // Fallback to original query
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `You are a semantic search query expander. Given a search query, generate 5-10 related terms, synonyms, and semantically similar concepts that would help find relevant content.

Query: "${query}"

Return a space-separated list of search terms including:
- The original terms
- Synonyms (e.g., "vendor" → "supplier", "provider")
- Related concepts (e.g., "consolidation" → "centralization", "integration", "streamlining")
- Industry variations (e.g., "partnership" → "alliance", "collaboration", "relationship")

Return ONLY the search terms, nothing else.`
        }]
      })
    });

    if (response.ok) {
      const result = await response.json();
      const expandedTerms = result.content[0].text.trim();
      console.log(`Semantic expansion: "${query}" → "${expandedTerms}"`);
      return expandedTerms;
    }
  } catch (error) {
    console.warn('Semantic search expansion failed:', error);
  }
  
  return query;
}

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
      .from('interview_questions')
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
      
      // Try semantic expansion, but fallback to original if it fails
      try {
        const semanticTerms = await generateSemanticSearchTerms(params.questionTopic);
        if (semanticTerms && semanticTerms.length > 0) {
          searchTerms = semanticTerms;
        }
      } catch (error) {
        console.warn('Semantic expansion failed, using original query:', error);
      }
      
      // Sanitize to prevent SQL injection
      const sanitizedTerms = searchTerms.replace(/[;'"\\]/g, ' ').trim();
      
      console.log(`Final search terms: "${sanitizedTerms}"`);
      
      // Search across all 3 key fields
      query = query.or(`question_text.ilike.%${sanitizedTerms}%,answer_summary.ilike.%${sanitizedTerms}%,expert_profile.ilike.%${sanitizedTerms}%`);
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
        console.log(`Calling AI agent for query: "${query}"`);
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
          console.log(`AI agent raw response: ${content.substring(0, 200)}...`);
          
          // Try to parse JSON from the response
          const jsonMatch = content.match(/\{[\s\S]*"searches"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log(`AI agent generated ${parsed.searches.length} searches`);
            console.log(`First search - Companies: ${parsed.searches[0].companies.join(', ')}, Roles: ${parsed.searches[0].role_keywords.join(', ')}`);
            return parsed.searches;
          } else {
            console.warn('AI agent response did not contain valid JSON');
          }
        } else {
          console.warn(`AI agent API call failed: ${response.status} ${response.statusText}`);
        }
      } else {
        console.warn('No Anthropic API key available');
      }
    } catch (error) {
      console.warn('AI agent exception:', error instanceof Error ? error.message : error);
    }

    // Enhanced fallback: smart detection for common patterns
    console.warn(`Fallback triggered for query: "${query}"`);
    
    let companies: string[] = [];
    let roleKeywords: string[] = [];
    let employmentStatus: 'current' | 'former' | 'any' = 'any';
    
    // Start with explicit parameters
    if (currentCompany) companies.push(currentCompany);
    if (currentTitle) roleKeywords.push(currentTitle);
    
    const queryLower = query.toLowerCase();
    
    // Extract employment status
    if (queryLower.includes('former') || queryLower.includes('ex-')) {
      employmentStatus = 'former';
    } else if (queryLower.includes('current')) {
      employmentStatus = 'current';
    }
    
    // Pattern detection - ONLY add companies if pattern is EXPLICITLY mentioned
    if (queryLower.includes('big 5') || queryLower.includes('executive search firm')) {
      companies = ['Korn Ferry', 'Russell Reynolds', 'Heidrick & Struggles', 'Spencer Stuart', 'Egon Zehnder'];
      roleKeywords = ['Partner', 'Principal', 'Director', 'VP', 'Executive Recruiter', 'Managing Director'];
    } else if (queryLower.match(/\b(mckinsey|bain|bcg|deloitte|pwc|accenture)\b/)) {
      // Only trigger if specific firm mentioned
      companies = [];
      if (queryLower.includes('mckinsey')) companies.push('McKinsey', 'McKinsey & Company');
      if (queryLower.includes('bain')) companies.push('Bain', 'Bain & Company');
      if (queryLower.includes('bcg')) companies.push('BCG', 'Boston Consulting Group');
      if (queryLower.includes('deloitte')) companies.push('Deloitte');
      if (queryLower.includes('pwc')) companies.push('PwC', 'PricewaterhouseCoopers');
      if (queryLower.includes('accenture')) companies.push('Accenture');
      if (queryLower.includes('consulting') && companies.length === 0) {
        companies = ['McKinsey', 'Bain', 'BCG', 'Deloitte', 'PwC'];
      }
      roleKeywords = ['Partner', 'Principal', 'Director', 'VP', 'Manager', 'Consultant'];
    } else if (queryLower.match(/\b(cdw|shi)\b/) || queryLower.includes('insight enterprises')) {
      // Only trigger for specific IT resellers
      if (queryLower.includes('cdw')) companies.push('CDW');
      if (queryLower.includes('shi')) companies.push('SHI', 'SHI International');
      if (queryLower.includes('insight')) companies.push('Insight', 'Insight Enterprises');
      roleKeywords = ['VP', 'Director', 'Manager', 'Sales', 'Account', 'Solutions'];
    } else if (queryLower.match(/\b(stripe|square|paypal|plaid|coinbase)\b/) || queryLower.includes('fintech')) {
      // Extract specific fintech companies mentioned
      if (queryLower.includes('stripe')) companies.push('Stripe');
      if (queryLower.includes('square')) companies.push('Square', 'Block');
      if (queryLower.includes('paypal')) companies.push('PayPal');
      if (queryLower.includes('plaid')) companies.push('Plaid');
      if (queryLower.includes('coinbase')) companies.push('Coinbase');
      roleKeywords = ['VP', 'Director', 'Head', 'Lead', 'Senior', 'Product', 'Engineering'];
    } else if (queryLower.match(/\b(google|microsoft|meta|amazon|apple|netflix)\b/)) {
      // Extract specific tech companies mentioned
      if (queryLower.includes('google')) companies.push('Google', 'Alphabet');
      if (queryLower.includes('microsoft')) companies.push('Microsoft');
      if (queryLower.includes('meta') || queryLower.includes('facebook')) companies.push('Meta', 'Facebook');
      if (queryLower.includes('amazon')) companies.push('Amazon', 'AWS');
      if (queryLower.includes('apple')) companies.push('Apple');
      if (queryLower.includes('netflix')) companies.push('Netflix');
      roleKeywords = ['VP', 'Director', 'Head', 'Lead', 'Senior', 'Principal', 'Engineering', 'Product'];
    } else {
      // TRUE GENERIC FALLBACK - extract what we can from the query
      // Look for recognizable company names in the query
      const words = query.split(/[\s,]+/);
      
      // Extract potential companies (capitalized words that aren't common roles)
      const commonRoles = ['VP', 'Director', 'Manager', 'Executive', 'Lead', 'Senior', 'Chief', 'Engineer', 'Product'];
      words.forEach(word => {
        const cleaned = word.replace(/[^a-zA-Z]/g, '');
        if (cleaned.length > 2 && cleaned[0] === cleaned[0].toUpperCase() && !commonRoles.includes(cleaned)) {
          companies.push(cleaned);
        }
      });
      
      // Extract role keywords
      const roleWords = ['engineering', 'product', 'sales', 'marketing', 'executive', 'director', 'manager', 'vp', 'chief', 'ceo', 'cto', 'cio', 'founder', 'architect', 'consultant', 'analyst'];
      words.forEach(word => {
        if (roleWords.includes(word.toLowerCase())) {
          roleKeywords.push(word);
        }
      });
      
      // If we couldn't extract anything, use broad search
      if (companies.length === 0 && roleKeywords.length === 0) {
        roleKeywords = ['VP', 'Director', 'Senior', 'Lead', 'Manager'];
        console.warn(`⚠️  Could not extract companies or specific roles from: "${query}"`);
      }
    }
    
    console.log(`Fallback result - Companies: [${companies.join(', ')}], Roles: [${roleKeywords.join(', ')}], Status: ${employmentStatus}`);
    
    return [{
      companies,
      role_keywords: roleKeywords,
      employment_status: employmentStatus,
      reasoning: 'Fallback search with pattern detection and extraction'
    }];
  }

  async getExpertInterviewHistory(expertId: number): Promise<InterviewMessage[]> {
    const { data, error } = await this.interviewsClient
      .from('interview_questions')
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
