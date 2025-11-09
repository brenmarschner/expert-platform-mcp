import { CallToolRequestSchema, ListToolsRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { SupabaseService } from '../services/supabase.js';
import { InterviewSearchSchema } from '../utils/validation.js';

const supabase = new SupabaseService();

export const interviewTools: Tool[] = [
  {
    name: 'search_interviews',
    description: 'Search and filter interview messages from past expert interviews. Find answers to research questions, analyze expert responses, and discover insights.',
    inputSchema: {
      type: 'object',
      properties: {
        expertName: {
          type: 'string',
          description: 'Filter by expert name (partial match supported)'
        },
        projectId: {
          type: 'number',
          description: 'Filter by specific project ID'
        },
        questionTopic: {
          type: 'string',
          description: 'Search for interviews containing questions or answers about this topic'
        },
        dateFrom: {
          type: 'string',
          description: 'Filter interviews from this date (ISO format: YYYY-MM-DD)'
        },
        dateTo: {
          type: 'string',
          description: 'Filter interviews to this date (ISO format: YYYY-MM-DD)'
        },
        minConsensusScore: {
          type: 'number',
          description: 'Minimum consensus score (0-10)',
          minimum: 0,
          maximum: 10
        },
        minCredibilityScore: {
          type: 'number',
          description: 'Minimum credibility score (0-10)',
          minimum: 0,
          maximum: 10
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 20,
          minimum: 1,
          maximum: 100
        }
      }
    }
  },
  {
    name: 'summarize_interviews',
    description: 'Generate comprehensive summaries of interview data. Analyze themes, consensus, and key insights across multiple interviews.',
    inputSchema: {
      type: 'object',
      properties: {
        expertName: {
          type: 'string',
          description: 'Summarize interviews from this expert'
        },
        projectId: {
          type: 'number',
          description: 'Summarize interviews from this project'
        },
        questionTopic: {
          type: 'string',
          description: 'Summarize interviews about this topic'
        },
        dateFrom: {
          type: 'string',
          description: 'Include interviews from this date onwards'
        },
        dateTo: {
          type: 'string',
          description: 'Include interviews up to this date'
        },
        focusArea: {
          type: 'string',
          description: 'What aspect to focus the summary on (e.g., "technical challenges", "market trends", "user feedback")'
        }
      }
    }
  },
  {
    name: 'get_interview_insights',
    description: 'Get statistical insights and quality metrics from interview data, including consensus scores, credibility ratings, and expert performance.',
    inputSchema: {
      type: 'object',
      properties: {
        expertName: {
          type: 'string',
          description: 'Analyze insights for this expert'
        },
        projectId: {
          type: 'number',
          description: 'Analyze insights for this project'
        },
        questionTopic: {
          type: 'string',
          description: 'Analyze insights about this topic'
        },
        dateFrom: {
          type: 'string',
          description: 'Include interviews from this date onwards'
        },
        dateTo: {
          type: 'string',
          description: 'Include interviews up to this date'
        }
      }
    }
  },
  {
    name: 'get_expert_interview_history',
    description: 'Get complete interview history for a specific expert, including all their responses and performance metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        expertId: {
          type: 'number',
          description: 'The ID of the expert to get interview history for',
          required: true
        }
      },
      required: ['expertId']
    }
  },
  {
    name: 'get_full_interview',
    description: 'Get complete interview transcript and summary by meeting ID. Returns all questions and answers from a single interview session.',
    inputSchema: {
      type: 'object',
      properties: {
        meetingId: {
          type: 'string',
          description: 'The meeting ID of the interview to retrieve',
          required: true
        }
      },
      required: ['meetingId']
    }
  }
];

export async function handleInterviewTool(name: string, arguments_: any): Promise<any> {
  try {
    switch (name) {
      case 'search_interviews': {
        const params = InterviewSearchSchema.parse(arguments_);
        const interviews = await supabase.searchInterviews(params);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                total_results: interviews.length,
                interviews: interviews.map(interview => ({
                  id: interview.id,
                  expert_name: interview.expert_name,
                  expert_profile: interview.expert_profile,
                  question_text: interview.question_text,
                  answer_summary: interview.answer_summary,
                  consensus_score: interview.consensus_score,
                  credibility_score: interview.credibility_score,
                  completion_score: interview.completion_score,
                  created_at: interview.created_at,
                  project_id: interview.project_id
                }))
              }, null, 2)
            }
          ]
        };
      }

      case 'summarize_interviews': {
        const params = InterviewSearchSchema.parse(arguments_);
        const interviews = await supabase.searchInterviews(params);
        
        if (interviews.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No interviews found matching the specified criteria.'
              }
            ]
          };
        }

        // Group by expert and topic for better summarization
        const expertGroups = new Map<string, any[]>();
        const topicGroups = new Map<string, any[]>();
        
        interviews.forEach(interview => {
          if (interview.expert_name) {
            if (!expertGroups.has(interview.expert_name)) {
              expertGroups.set(interview.expert_name, []);
            }
            expertGroups.get(interview.expert_name)!.push(interview);
          }
          
          if (interview.question_text) {
            // Simple topic extraction - could be enhanced with AI
            const topic = interview.question_text.split(' ').slice(0, 3).join(' ');
            if (!topicGroups.has(topic)) {
              topicGroups.set(topic, []);
            }
            topicGroups.get(topic)!.push(interview);
          }
        });

        const summary = {
          overview: {
            total_interviews: interviews.length,
            unique_experts: expertGroups.size,
            date_range: {
              from: interviews[interviews.length - 1]?.created_at,
              to: interviews[0]?.created_at
            },
            focus_area: arguments_.focusArea || 'General analysis'
          },
          expert_insights: Array.from(expertGroups.entries()).map(([expert, expertInterviews]) => ({
            expert_name: expert,
            interview_count: expertInterviews.length,
            avg_consensus_score: expertInterviews.filter(i => i.consensus_score).reduce((sum, i) => sum + i.consensus_score!, 0) / expertInterviews.filter(i => i.consensus_score).length || 0,
            avg_credibility_score: expertInterviews.filter(i => i.credibility_score).reduce((sum, i) => sum + i.credibility_score!, 0) / expertInterviews.filter(i => i.credibility_score).length || 0,
            key_topics: [...new Set(expertInterviews.map(i => i.question_text).filter(Boolean).map(q => q!.split(' ').slice(0, 5).join(' ')))]
          })),
          key_themes: Array.from(topicGroups.entries()).map(([topic, topicInterviews]) => ({
            topic,
            frequency: topicInterviews.length,
            avg_consensus: topicInterviews.filter(i => i.consensus_score).reduce((sum, i) => sum + i.consensus_score!, 0) / topicInterviews.filter(i => i.consensus_score).length || 0
          })).sort((a, b) => b.frequency - a.frequency).slice(0, 10),
          quality_metrics: {
            avg_consensus_score: interviews.filter(i => i.consensus_score).reduce((sum, i) => sum + i.consensus_score!, 0) / interviews.filter(i => i.consensus_score).length || 0,
            avg_credibility_score: interviews.filter(i => i.credibility_score).reduce((sum, i) => sum + i.credibility_score!, 0) / interviews.filter(i => i.credibility_score).length || 0,
            avg_completion_score: interviews.filter(i => i.completion_score).reduce((sum, i) => sum + i.completion_score!, 0) / interviews.filter(i => i.completion_score).length || 0
          }
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2)
            }
          ]
        };
      }

      case 'get_interview_insights': {
        const params = InterviewSearchSchema.parse(arguments_);
        const insights = await supabase.getInterviewInsights(params);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                insights,
                interpretation: {
                  quality_assessment: insights.averageConsensusScore >= 7 ? 'High quality responses with strong consensus' :
                                    insights.averageConsensusScore >= 5 ? 'Moderate quality responses' :
                                    'Lower consensus - may need follow-up interviews',
                  credibility_assessment: insights.averageCredibilityScore >= 7 ? 'Highly credible expert responses' :
                                        insights.averageCredibilityScore >= 5 ? 'Moderately credible responses' :
                                        'Lower credibility - verify expert qualifications',
                  completion_assessment: insights.averageCompletionScore >= 0.8 ? 'Comprehensive interview coverage' :
                                       insights.averageCompletionScore >= 0.6 ? 'Good interview coverage' :
                                       'Incomplete interviews - consider follow-up sessions'
                }
              }, null, 2)
            }
          ]
        };
      }

      case 'get_expert_interview_history': {
        const expertId = arguments_.expertId;
        if (typeof expertId !== 'number') {
          throw new Error('expertId must be a number');
        }
        
        const interviews = await supabase.getExpertInterviewHistory(expertId);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                expert_id: expertId,
                total_interviews: interviews.length,
                interviews: interviews.map(interview => ({
                  id: interview.id,
                  question_text: interview.question_text,
                  answer_summary: interview.answer_summary,
                  consensus_score: interview.consensus_score,
                  credibility_score: interview.credibility_score,
                  completion_score: interview.completion_score,
                  created_at: interview.created_at,
                  project_id: interview.project_id
                }))
              }, null, 2)
            }
          ]
        };
      }

      case 'get_full_interview': {
        const meetingId = arguments_.meetingId;
        if (typeof meetingId !== 'string') {
          throw new Error('meetingId must be a string');
        }
        
        const interviews = await supabase.getFullInterview(meetingId);
        
        if (interviews.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No interview found with meeting ID: ${meetingId}`
              }
            ]
          };
        }

        // Group by expert and create summary
        const expertName = interviews[0].expert_name;
        const expertProfile = interviews[0].expert_profile;
        const projectId = interviews[0].project_id;
        
        const summary = {
          meeting_id: meetingId,
          expert_name: expertName,
          expert_profile: expertProfile,
          project_id: projectId,
          total_questions: interviews.length,
          interview_date: interviews[0].created_at,
          questions_and_answers: interviews.map(interview => ({
            question: interview.question_text,
            answer: interview.answer_summary,
            consensus_score: interview.consensus_score,
            credibility_score: interview.credibility_score,
            completion_score: interview.completion_score
          })),
          overall_quality: {
            avg_consensus_score: interviews.filter(i => i.consensus_score).reduce((sum, i) => sum + i.consensus_score!, 0) / interviews.filter(i => i.consensus_score).length || 0,
            avg_credibility_score: interviews.filter(i => i.credibility_score).reduce((sum, i) => sum + i.credibility_score!, 0) / interviews.filter(i => i.credibility_score).length || 0,
            avg_completion_score: interviews.filter(i => i.completion_score).reduce((sum, i) => sum + i.completion_score!, 0) / interviews.filter(i => i.completion_score).length || 0
          }
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
        }
      ],
      isError: true
    };
  }
}
