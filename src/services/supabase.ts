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
    const { data, error } = await this.expertsClient
      .rpc('search_experts_company_role', {
        search_query: params.query,
        current_company_filter: params.currentCompany || null,
        current_title_filter: params.currentTitle || null,
        location_filter: params.location || null,
        result_limit: params.limit
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
