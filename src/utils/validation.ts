import { z } from 'zod';

export const InterviewSearchSchema = z.object({
  expertName: z.string().optional(),
  projectId: z.number().optional(),
  questionTopic: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minConsensusScore: z.number().min(0).max(10).optional(),
  minCredibilityScore: z.number().min(0).max(10).optional(),
  limit: z.number().min(1).max(100).default(20)
});

export const ExpertSearchSchema = z.object({
  query: z.string().min(1),
  currentCompany: z.string().optional(),
  currentTitle: z.string().optional(),
  location: z.string().optional(),
  limit: z.number().min(1).max(50).default(10)
});

export const InterviewGuideSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(10),
  questions: z.array(z.object({
    question: z.string().min(1),
    category: z.enum(['background', 'experience', 'technical', 'opinion', 'scenario']),
    priority: z.enum(['high', 'medium', 'low']),
    followUpSuggestions: z.array(z.string()).optional()
  })).min(1),
  expertCriteria: z.object({
    currentCompany: z.string().optional(),
    recentCompanies: z.array(z.string()).optional(),
    currentTitle: z.string().optional(),
    recentTitles: z.array(z.string()).optional(),
    experienceYears: z.number().min(0).optional(),
    location: z.string().optional(),
    industryExperience: z.array(z.string()).optional()
  })
});

export const ExpertRequestSchema = z.object({
  requestTitle: z.string().min(1),
  description: z.string().min(10),
  expertCriteria: z.object({
    currentCompany: z.string().optional(),
    recentCompanies: z.array(z.string()).optional(),
    currentTitle: z.string().optional(),
    recentTitles: z.array(z.string()).optional(),
    experienceYears: z.number().min(0).optional(),
    location: z.string().optional(),
    industryExperience: z.array(z.string()).optional()
  }),
  urgency: z.enum(['low', 'medium', 'high']).default('medium'),
  budget: z.number().min(0).optional(),
  timeline: z.string().optional()
});

export type InterviewSearchInput = z.infer<typeof InterviewSearchSchema>;
export type ExpertSearchInput = z.infer<typeof ExpertSearchSchema>;
export type InterviewGuideInput = z.infer<typeof InterviewGuideSchema>;
export type ExpertRequestInput = z.infer<typeof ExpertRequestSchema>;
