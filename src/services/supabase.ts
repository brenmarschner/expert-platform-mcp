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
      query = query.or(`question_text.ilike.%${params.questionTopic}%,answer_summary.ilike.%${params.questionTopic}%`);
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

    // Fallback: simple single search
    const companies = currentCompany ? [currentCompany] : [];
    const roleKeywords = currentTitle ? [currentTitle] : query.split(' ').filter(word => word.length > 2);
    
    return [{
      companies,
      role_keywords: roleKeywords,
      employment_status: 'any' as const,
      reasoning: 'Fallback search when AI agent is unavailable'
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
