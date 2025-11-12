import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SupabaseService } from '../services/supabase.js';
import { ExpertSearchSchema } from '../utils/validation.js';

const supabase = new SupabaseService();

export const expertTools: Tool[] = [
  {
    name: 'search_experts',
    description: 'Search for experts using the existing expert database. Find experts by company, role, location, and other criteria.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for expert skills, experience, or background',
          required: true
        },
        currentCompany: {
          type: 'string',
          description: 'Filter by current company name'
        },
        currentTitle: {
          type: 'string',
          description: 'Filter by current job title'
        },
        location: {
          type: 'string',
          description: 'Filter by location'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10,
          minimum: 1,
          maximum: 50
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_expert_profile',
    description: 'Get detailed profile information for a specific expert by their ID.',
    inputSchema: {
      type: 'object',
      properties: {
        expertId: {
          type: 'string',
          description: 'The UUID of the expert to retrieve',
          required: true
        }
      },
      required: ['expertId']
    }
  },
  {
    name: 'get_expert_availability',
    description: 'Check the availability and scheduling status of experts.',
    inputSchema: {
      type: 'object',
      properties: {
        expertIds: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Array of expert UUIDs to check availability for'
        },
        state: {
          type: 'string',
          enum: ['vetting', 'ready_to_schedule', 'scheduled', 'completed', 'disqualified'],
          description: 'Filter experts by their current state'
        }
      }
    }
  },
  {
    name: 'analyze_expert_pool',
    description: 'Analyze the available expert pool for patterns, skills distribution, and availability trends.',
    inputSchema: {
      type: 'object',
      properties: {
        focusArea: {
          type: 'string',
          description: 'Focus the analysis on a specific area (e.g., "fintech", "AI/ML", "healthcare")'
        },
        includeMetrics: {
          type: 'boolean',
          description: 'Include performance metrics from past interviews',
          default: true
        }
      }
    }
  }
];

export async function handleExpertTool(name: string, arguments_: any): Promise<any> {
  try {
    switch (name) {
      case 'search_experts': {
        const params = ExpertSearchSchema.parse(arguments_);
        const experts = await supabase.searchExperts(params);
        
        // Format for ChatGPT with clear structure
        let resultText = `📊 EXPERT SEARCH RESULTS\n\nFound ${experts.length} expert${experts.length !== 1 ? 's' : ''} matching: "${params.query}"\n\n`;
        
        if (experts.length === 0) {
          resultText += `No experts found. Try:\n- Broader search terms\n- Different companies\n- Name search (e.g., "Adam Ortiz")\n- Abbreviations (BCG, MBB, PwC)`;
        } else {
          experts.forEach((expert, index) => {
            resultText += `${index + 1}. **${expert.full_name}**\n`;
            resultText += `   • ${expert.current_title || 'N/A'} at ${expert.current_company || 'N/A'}\n`;
            
            // Show RELEVANT experience
            const relevantExp = (expert as any).searchable_text || expert.background_summary || expert.relevant_job_history;
            if (relevantExp) {
              const expText = relevantExp
                .substring(0, 200)
                .replace(/\n+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              resultText += `   • ${expText}...\n`;
            }
            
            if (expert.recent_companies && expert.recent_companies.length > 1) {
              resultText += `   • Career: ${expert.recent_companies.slice(0, 3).join(' → ')}\n`;
            }
            
            resultText += '\n';
          });
          
          // Add clear next steps
          resultText += `\n💡 **Next Steps:**\n`;
          resultText += `- Request interviews: "Schedule interview with [name] about [topic]"\n`;
          resultText += `- Get more details: "Tell me more about [name]"\n`;
          resultText += `- Find similar: "Find 10 more experts like [name]"`;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: resultText
            }
          ]
        };
      }

      case 'get_expert_profile': {
        const expertId = arguments_.expertId;
        if (typeof expertId !== 'string') {
          throw new Error('expertId must be a string UUID');
        }
        
        const expert = await supabase.getExpertProfile(expertId);
        
        if (!expert) {
          return {
            content: [
              {
                type: 'text',
                text: `Expert with ID ${expertId} not found.`
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                profile: {
                  id: expert.id,
                  full_name: expert.full_name,
                  email: expert.email,
                  phone_number: expert.phone_number,
                  linkedin_url: expert.linkedin_url,
                  background_summary: expert.background_summary,
                  current_company: expert.current_company,
                  current_title: expert.current_title,
                  current_start_year: expert.current_start_year,
                  location: expert.location,
                  state: expert.state,
                  rate_amount: expert.rate_amount,
                  relevant_job_history: expert.relevant_job_history,
                  recent_companies: expert.recent_companies,
                  recent_titles: expert.recent_titles,
                  all_companies: expert.all_companies,
                  is_currently_employed: expert.is_currently_employed,
                  qa_passed: expert.qa_passed,
                  call_booked: expert.call_booked,
                  booking_link_issued: expert.booking_link_issued,
                  confirmed_time: expert.confirmed_time,
                  created_at: expert.created_at,
                  updated_at: expert.updated_at
                }
              }, null, 2)
            }
          ]
        };
      }

      case 'get_expert_availability': {
        const { expertIds, state } = arguments_;
        
        // If specific expert IDs provided, get those profiles
        if (expertIds && Array.isArray(expertIds)) {
          const profiles = await Promise.all(
            expertIds.map(id => supabase.getExpertProfile(id))
          );
          
          const availableExperts = profiles
            .filter(expert => expert !== null)
            .map(expert => ({
              id: expert!.id,
              full_name: expert!.full_name,
              state: expert!.state,
              call_booked: expert!.call_booked,
              confirmed_time: expert!.confirmed_time,
              next_action_at: expert!.next_action_at,
              availability_status: expert!.state === 'ready_to_schedule' && !expert!.call_booked ? 'available' :
                                expert!.state === 'scheduled' ? 'scheduled' :
                                expert!.state === 'completed' ? 'completed' :
                                expert!.state === 'vetting' ? 'in_vetting' : 'unavailable'
            }));
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  requested_experts: expertIds.length,
                  found_experts: availableExperts.length,
                  availability: availableExperts
                }, null, 2)
              }
            ]
          };
        }
        
        // If state filter provided, this would require a different query
        // For now, return guidance on using the search function
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                message: 'To check availability by state, please use the search_experts tool with specific criteria.',
                available_states: ['vetting', 'ready_to_schedule', 'scheduled', 'completed', 'disqualified'],
                suggestion: 'Use search_experts with a broad query and then check the "state" field in results.'
              }, null, 2)
            }
          ]
        };
      }

      case 'analyze_expert_pool': {
        const { focusArea, includeMetrics } = arguments_;
        
        // Get a sample of experts for analysis
        const sampleExperts = await supabase.searchExperts({
          query: focusArea || 'expert',
          limit: 50
        });
        
        const analysis = {
          overview: {
            total_analyzed: sampleExperts.length,
            focus_area: focusArea || 'General pool',
            analysis_date: new Date().toISOString()
          },
          state_distribution: {} as Record<string, number>,
          company_distribution: {} as Record<string, number>,
          title_distribution: {} as Record<string, number>,
          location_distribution: {} as Record<string, number>,
          employment_status: {
            currently_employed: 0,
            not_employed: 0,
            unknown: 0
          },
          scheduling_metrics: {
            qa_passed: 0,
            ready_to_schedule: 0,
            calls_booked: 0,
            completed_interviews: 0
          }
        };
        
        sampleExperts.forEach(expert => {
          // State distribution
          analysis.state_distribution[expert.state] = (analysis.state_distribution[expert.state] || 0) + 1;
          
          // Company distribution
          if (expert.current_company) {
            analysis.company_distribution[expert.current_company] = (analysis.company_distribution[expert.current_company] || 0) + 1;
          }
          
          // Title distribution
          if (expert.current_title) {
            analysis.title_distribution[expert.current_title] = (analysis.title_distribution[expert.current_title] || 0) + 1;
          }
          
          // Location distribution
          if (expert.location) {
            analysis.location_distribution[expert.location] = (analysis.location_distribution[expert.location] || 0) + 1;
          }
          
          // Employment status
          if (expert.is_currently_employed === true) {
            analysis.employment_status.currently_employed++;
          } else if (expert.is_currently_employed === false) {
            analysis.employment_status.not_employed++;
          } else {
            analysis.employment_status.unknown++;
          }
          
          // Scheduling metrics
          if (expert.qa_passed) analysis.scheduling_metrics.qa_passed++;
          if (expert.state === 'ready_to_schedule') analysis.scheduling_metrics.ready_to_schedule++;
          if (expert.call_booked) analysis.scheduling_metrics.calls_booked++;
          if (expert.state === 'completed') analysis.scheduling_metrics.completed_interviews++;
        });
        
        // Sort distributions by frequency
        const sortByFrequency = (obj: Record<string, number>) => 
          Object.entries(obj)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
        
        analysis.company_distribution = sortByFrequency(analysis.company_distribution);
        analysis.title_distribution = sortByFrequency(analysis.title_distribution);
        analysis.location_distribution = sortByFrequency(analysis.location_distribution);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                expert_pool_analysis: analysis,
                insights: {
                  most_common_state: Object.entries(analysis.state_distribution).sort(([,a], [,b]) => b - a)[0]?.[0],
                  top_company: Object.entries(analysis.company_distribution)[0]?.[0],
                  top_title: Object.entries(analysis.title_distribution)[0]?.[0],
                  employment_rate: ((analysis.employment_status.currently_employed / sampleExperts.length) * 100).toFixed(1) + '%',
                  qa_pass_rate: ((analysis.scheduling_metrics.qa_passed / sampleExperts.length) * 100).toFixed(1) + '%',
                  interview_completion_rate: analysis.scheduling_metrics.calls_booked > 0 ? 
                    ((analysis.scheduling_metrics.completed_interviews / analysis.scheduling_metrics.calls_booked) * 100).toFixed(1) + '%' : 'N/A'
                }
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
