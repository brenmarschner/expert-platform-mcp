import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SlackService } from '../services/slack.js';
import { InterviewGuideSchema, ExpertRequestSchema } from '../utils/validation.js';
import type { InterviewGuide, InterviewQuestion, ExpertCriteria } from '../types/schema.js';

const slack = new SlackService();

export const requestTools: Tool[] = [
  {
    name: 'create_interview_guide',
    description: 'Create a structured interview guide with questions categorized by type and priority. This will also trigger a Slack notification to the internal team.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Title of the interview guide',
          required: true
        },
        description: {
          type: 'string',
          description: 'Description of what this interview aims to discover',
          required: true
        },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                description: 'The interview question'
              },
              category: {
                type: 'string',
                enum: ['background', 'experience', 'technical', 'opinion', 'scenario'],
                description: 'Category of the question'
              },
              priority: {
                type: 'string',
                enum: ['high', 'medium', 'low'],
                description: 'Priority level of the question'
              },
              followUpSuggestions: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Suggested follow-up questions'
              }
            },
            required: ['question', 'category', 'priority']
          },
          description: 'Array of interview questions'
        },
        expertCriteria: {
          type: 'object',
          properties: {
            currentCompany: {
              type: 'string',
              description: 'Desired current company of expert'
            },
            recentCompanies: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'List of recent companies the expert should have worked at'
            },
            currentTitle: {
              type: 'string',
              description: 'Desired current job title'
            },
            recentTitles: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'List of recent job titles the expert should have held'
            },
            experienceYears: {
              type: 'number',
              description: 'Minimum years of experience required'
            },
            location: {
              type: 'string',
              description: 'Preferred location of the expert'
            },
            industryExperience: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Industry experience areas required'
            }
          },
          description: 'Criteria for finding suitable experts'
        },
        requestedBy: {
          type: 'string',
          description: 'Name or identifier of the person requesting the interview',
          default: 'MCP User'
        }
      },
      required: ['title', 'description', 'questions', 'expertCriteria']
    }
  },
  {
    name: 'generate_interview_questions',
    description: 'Generate suggested interview questions based on a topic or research area. Use this to help build interview guides.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The main topic or research area for the interview',
          required: true
        },
        expertBackground: {
          type: 'string',
          description: 'Background of the type of expert you want to interview (e.g., "fintech executive", "AI researcher")'
        },
        focusAreas: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Specific areas to focus on within the topic'
        },
        questionCount: {
          type: 'number',
          description: 'Number of questions to generate',
          default: 10,
          minimum: 5,
          maximum: 25
        },
        difficulty: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          description: 'Difficulty level of questions',
          default: 'intermediate'
        }
      },
      required: ['topic']
    }
  },
  {
    name: 'request_expert_sourcing',
    description: 'Create a request for sourcing new experts that match specific criteria. This will notify the internal team via Slack.',
    inputSchema: {
      type: 'object',
      properties: {
        requestTitle: {
          type: 'string',
          description: 'Title of the expert sourcing request',
          required: true
        },
        description: {
          type: 'string',
          description: 'Detailed description of what type of expert is needed and why',
          required: true
        },
        expertCriteria: {
          type: 'object',
          properties: {
            currentCompany: {
              type: 'string',
              description: 'Desired current company of expert'
            },
            recentCompanies: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'List of recent companies the expert should have worked at'
            },
            currentTitle: {
              type: 'string',
              description: 'Desired current job title'
            },
            recentTitles: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'List of recent job titles the expert should have held'
            },
            experienceYears: {
              type: 'number',
              description: 'Minimum years of experience required'
            },
            location: {
              type: 'string',
              description: 'Preferred location of the expert'
            },
            industryExperience: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Industry experience areas required'
            }
          },
          description: 'Detailed criteria for the expert to be sourced'
        },
        urgency: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Urgency level of the request',
          default: 'medium'
        },
        budget: {
          type: 'number',
          description: 'Budget range for the expert (optional)'
        },
        timeline: {
          type: 'string',
          description: 'When the expert is needed (e.g., "within 2 weeks", "by end of month")'
        },
        requestedBy: {
          type: 'string',
          description: 'Name or identifier of the person making the request',
          default: 'MCP User'
        }
      },
      required: ['requestTitle', 'description', 'expertCriteria']
    }
  },
  {
    name: 'launch_interview_request',
    description: 'Combine an interview guide with expert criteria and launch a complete interview request. This creates the guide and notifies the team in one action.',
    inputSchema: {
      type: 'object',
      properties: {
        interviewGuide: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  category: { 
                    type: 'string',
                    enum: ['background', 'experience', 'technical', 'opinion', 'scenario']
                  },
                  priority: { 
                    type: 'string',
                    enum: ['high', 'medium', 'low']
                  },
                  followUpSuggestions: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                },
                required: ['question', 'category', 'priority']
              }
            },
            expertCriteria: {
              type: 'object',
              properties: {
                currentCompany: { type: 'string' },
                recentCompanies: { type: 'array', items: { type: 'string' } },
                currentTitle: { type: 'string' },
                recentTitles: { type: 'array', items: { type: 'string' } },
                experienceYears: { type: 'number' },
                location: { type: 'string' },
                industryExperience: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          required: ['title', 'description', 'questions', 'expertCriteria']
        },
        urgency: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Urgency level of the interview request',
          default: 'medium'
        },
        requestedBy: {
          type: 'string',
          description: 'Name or identifier of the person making the request',
          default: 'MCP User'
        }
      },
      required: ['interviewGuide']
    }
  }
];

export async function handleRequestTool(name: string, arguments_: any): Promise<any> {
  try {
    switch (name) {
      case 'create_interview_guide': {
        const validatedData = InterviewGuideSchema.parse(arguments_);
        const requestedBy = arguments_.requestedBy || 'MCP User';
        
        // Create the interview guide object
        const guide: InterviewGuide = {
          title: validatedData.title,
          description: validatedData.description,
          questions: validatedData.questions,
          expertCriteria: validatedData.expertCriteria
        };
        
        // Send Slack notification
        await slack.notifyInterviewRequest(guide, requestedBy);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Interview guide created and team notified via Slack',
                guide: {
                  title: guide.title,
                  description: guide.description,
                  question_count: guide.questions.length,
                  questions_by_category: guide.questions.reduce((acc, q) => {
                    acc[q.category] = (acc[q.category] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>),
                  questions_by_priority: guide.questions.reduce((acc, q) => {
                    acc[q.priority] = (acc[q.priority] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>),
                  expert_criteria: guide.expertCriteria
                },
                next_steps: [
                  'Internal team has been notified via Slack',
                  'Team will review and approve the interview guide',
                  'Expert sourcing will begin once approved',
                  'You will be notified when experts are identified and ready to schedule'
                ]
              }, null, 2)
            }
          ]
        };
      }

      case 'generate_interview_questions': {
        const { topic, expertBackground, focusAreas, questionCount = 10, difficulty = 'intermediate' } = arguments_;
        
        // Generate questions based on the provided parameters
        const questionTemplates = {
          background: [
            `Can you walk me through your background in ${topic}?`,
            `What drew you to specialize in ${topic}?`,
            `How has your experience in ${topic} evolved over the years?`
          ],
          experience: [
            `What are the most significant challenges you've encountered in ${topic}?`,
            `Can you describe a particularly complex project you worked on related to ${topic}?`,
            `What trends have you observed in ${topic} over the past few years?`
          ],
          technical: [
            `What are the key technical considerations when implementing ${topic} solutions?`,
            `How do you approach problem-solving in ${topic}?`,
            `What tools or methodologies do you rely on most in ${topic}?`
          ],
          opinion: [
            `Where do you see ${topic} heading in the next 5 years?`,
            `What are the biggest misconceptions about ${topic}?`,
            `What advice would you give to someone new to ${topic}?`
          ],
          scenario: [
            `If you had to solve [specific scenario] in ${topic}, how would you approach it?`,
            `Imagine you're consulting for a company struggling with ${topic} - what would be your first steps?`,
            `How would you handle resistance to ${topic} adoption in an organization?`
          ]
        };
        
        const categories = Object.keys(questionTemplates) as Array<keyof typeof questionTemplates>;
        const priorities = ['high', 'medium', 'low'] as const;
        
        const questions: InterviewQuestion[] = [];
        const questionsPerCategory = Math.ceil(questionCount / categories.length);
        
        categories.forEach(category => {
          const templates = questionTemplates[category];
          for (let i = 0; i < Math.min(questionsPerCategory, templates.length) && questions.length < questionCount; i++) {
            let question = templates[i];
            
            // Customize question based on expert background
            if (expertBackground) {
              question = question.replace(`in ${topic}`, `in ${topic} as a ${expertBackground}`);
            }
            
            // Add focus areas if provided
            if (focusAreas && focusAreas.length > 0 && Math.random() > 0.5) {
              const focusArea = focusAreas[Math.floor(Math.random() * focusAreas.length)];
              question += ` Specifically regarding ${focusArea}.`;
            }
            
            questions.push({
              question,
              category,
              priority: priorities[Math.floor(Math.random() * priorities.length)],
              followUpSuggestions: [
                'Can you provide a specific example?',
                'What were the key factors that influenced your approach?',
                'How did you measure success in this situation?'
              ]
            });
          }
        });
        
        // Ensure we have exactly the requested number of questions
        while (questions.length < questionCount) {
          const category = categories[Math.floor(Math.random() * categories.length)];
          const template = questionTemplates[category][0];
          questions.push({
            question: template.replace(`${topic}`, `${topic} (additional insight)`),
            category,
            priority: 'medium',
            followUpSuggestions: ['Can you elaborate on this?']
          });
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                generated_questions: {
                  topic,
                  expert_background: expertBackground,
                  focus_areas: focusAreas,
                  difficulty,
                  total_questions: questions.length,
                  questions: questions
                },
                usage_tip: 'You can now use these questions with the create_interview_guide tool to create a complete interview guide and notify your team.'
              }, null, 2)
            }
          ]
        };
      }

      case 'request_expert_sourcing': {
        const validatedData = ExpertRequestSchema.parse(arguments_);
        const requestedBy = arguments_.requestedBy || 'MCP User';
        
        // Send Slack notification for expert sourcing request
        await slack.notifyExpertRequest(
          validatedData.requestTitle,
          validatedData.description,
          validatedData.expertCriteria,
          validatedData.urgency,
          requestedBy
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Expert sourcing request created and team notified via Slack',
                request: {
                  title: validatedData.requestTitle,
                  description: validatedData.description,
                  expert_criteria: validatedData.expertCriteria,
                  urgency: validatedData.urgency,
                  budget: validatedData.budget,
                  timeline: validatedData.timeline,
                  requested_by: requestedBy
                },
                next_steps: [
                  'Internal sourcing team has been notified via Slack',
                  'Team will begin searching for experts matching your criteria',
                  'You will be contacted when suitable experts are identified',
                  'Expert vetting and qualification process will begin'
                ]
              }, null, 2)
            }
          ]
        };
      }

      case 'launch_interview_request': {
        const { interviewGuide, urgency = 'medium', requestedBy = 'MCP User' } = arguments_;
        
        // Validate the interview guide
        const validatedGuide = InterviewGuideSchema.parse(interviewGuide);
        
        const guide: InterviewGuide = {
          title: validatedGuide.title,
          description: validatedGuide.description,
          questions: validatedGuide.questions,
          expertCriteria: validatedGuide.expertCriteria
        };
        
        // Send comprehensive Slack notification
        await slack.notifyInterviewRequest(guide, requestedBy);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Complete interview request launched and team notified via Slack',
                interview_request: {
                  title: guide.title,
                  description: guide.description,
                  urgency,
                  question_count: guide.questions.length,
                  questions_breakdown: {
                    by_category: guide.questions.reduce((acc, q) => {
                      acc[q.category] = (acc[q.category] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>),
                    by_priority: guide.questions.reduce((acc, q) => {
                      acc[q.priority] = (acc[q.priority] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  },
                  expert_criteria: guide.expertCriteria,
                  requested_by: requestedBy
                },
                workflow_status: {
                  guide_created: true,
                  team_notified: true,
                  awaiting_approval: true,
                  expert_sourcing: 'pending_approval'
                },
                next_steps: [
                  'Internal team will review the interview guide and expert criteria',
                  'Upon approval, expert sourcing will begin immediately',
                  'Qualified experts will be vetted and scheduled',
                  'You will receive updates on expert identification and interview scheduling'
                ]
              }, null, 2)
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
