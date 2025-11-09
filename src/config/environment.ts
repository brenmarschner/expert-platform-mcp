import { config } from 'dotenv';

// Load environment variables from .env file
config();

interface Environment {
  supabaseInterviewsUrl: string;
  supabaseInterviewsServiceRoleKey: string;
  supabaseExpertsUrl: string;
  supabaseExpertsServiceRoleKey: string;
  slackWebhookUrl: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
}

function getEnvironment(): Environment {
  const supabaseInterviewsUrl = process.env.SUPABASE_INTERVIEWS_URL;
  const supabaseInterviewsServiceRoleKey = process.env.SUPABASE_INTERVIEWS_SERVICE_ROLE_KEY;
  const supabaseExpertsUrl = process.env.SUPABASE_EXPERTS_URL;
  const supabaseExpertsServiceRoleKey = process.env.SUPABASE_EXPERTS_SERVICE_ROLE_KEY;
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!supabaseInterviewsUrl) {
    throw new Error('SUPABASE_INTERVIEWS_URL environment variable is required');
  }

  if (!supabaseInterviewsServiceRoleKey) {
    throw new Error('SUPABASE_INTERVIEWS_SERVICE_ROLE_KEY environment variable is required');
  }

  if (!supabaseExpertsUrl) {
    throw new Error('SUPABASE_EXPERTS_URL environment variable is required');
  }

  if (!supabaseExpertsServiceRoleKey) {
    throw new Error('SUPABASE_EXPERTS_SERVICE_ROLE_KEY environment variable is required');
  }

  if (!slackWebhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL environment variable is required');
  }

  return {
    supabaseInterviewsUrl,
    supabaseInterviewsServiceRoleKey,
    supabaseExpertsUrl,
    supabaseExpertsServiceRoleKey,
    slackWebhookUrl,
    openaiApiKey,
    anthropicApiKey
  };
}

export const env = getEnvironment();
