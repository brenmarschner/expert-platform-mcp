export interface InterviewMessage {
  id: number;
  created_at: string;
  project_id: number | null;
  call_id: number | null;
  meeting_id: string | null;
  expert_id: number | null;
  question_text: string | null;
  answer_summary: string | null;
  expert_profile: string | null;
  consensus_score: number | null;
  consensus_rationale: string | null;
  credibility_score: number | null;
  credibility_rationale: string | null;
  completion_score: number | null;
  acceptability_baseline: number | null;
  acceptability_actual: number | null;
  depth_baseline: number | null;
  depth_actual: number | null;
  eval_results: any | null;
  expected_answer: string | null;
  message_text: string | null;
  message_author: string | null;
  message_json: any | null;
  expert_name: string | null;
}

export interface Expert {
  id: string;
  airtable_id: string | null;
  project_airtable_id: string | null;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  linkedin_url: string | null;
  background_summary: string | null;
  state: ExpertState;
  owner_user_id: string | null;
  qa_passed: boolean | null;
  call_booked: boolean | null;
  booking_link_issued: boolean | null;
  proposed_times: any[];
  confirmed_time: string | null;
  retell_call_id: string | null;
  next_action_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  project_context: any;
  scheduled_offramp: boolean | null;
  offramp_scheduled_for: string | null;
  kill_switch: boolean | null;
  location: string | null;
  rate_amount: number | null;
  relevant_job_history: string | null;
  anne_actions: boolean | null;
  full_work_history: any | null;
  linkedin_normalized: string | null;
  is_enriched: boolean | null;
  internal_batch_import: boolean | null;
  enrichment_attempts: number | null;
  phone_number_verified: boolean | null;
  searchable_text: string | null;
  expert_dnc: boolean | null;
  current_company: string | null;
  current_title: string | null;
  current_start_year: number | null;
  recent_companies: string[] | null;
  recent_titles: string[] | null;
  all_companies: string[] | null;
  is_currently_employed: boolean | null;
}

export type ExpertState = 'vetting' | 'ready_to_schedule' | 'scheduled' | 'completed' | 'disqualified';

export interface InterviewGuide {
  title: string;
  description: string;
  questions: InterviewQuestion[];
  expertCriteria: ExpertCriteria;
}

export interface InterviewQuestion {
  question: string;
  category: 'background' | 'experience' | 'technical' | 'opinion' | 'scenario';
  priority: 'high' | 'medium' | 'low';
  followUpSuggestions?: string[];
}

export interface ExpertCriteria {
  currentCompany?: string;
  recentCompanies?: string[];
  currentTitle?: string;
  recentTitles?: string[];
  experienceYears?: number;
  location?: string;
  industryExperience?: string[];
}

export interface SlackNotification {
  text: string;
  blocks?: any[];
  channel?: string;
}
