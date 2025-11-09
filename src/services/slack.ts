import { env } from '../config/environment.js';
import type { SlackNotification, InterviewGuide, ExpertCriteria } from '../types/schema.js';

export class SlackService {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = env.slackWebhookUrl;
  }

  async sendNotification(notification: SlackNotification): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to send Slack notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async notifyInterviewRequest(guide: InterviewGuide, requestedBy: string = 'MCP User'): Promise<void> {
    const criteriaText = this.formatExpertCriteria(guide.expertCriteria);
    
    const notification: SlackNotification = {
      text: `New Interview Request: ${guide.title}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🎯 New Interview Request: ${guide.title}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Requested by:* ${requestedBy}`
            },
            {
              type: 'mrkdwn',
              text: `*Questions:* ${guide.questions.length} questions`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Description:*\n${guide.description}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Expert Criteria:*\n${criteriaText}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Questions Preview:*\n${this.formatQuestionsPreview(guide.questions)}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '✅ Approve & Source Experts'
              },
              style: 'primary',
              value: 'approve'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '📝 Request Changes'
              },
              value: 'changes'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '❌ Decline'
              },
              style: 'danger',
              value: 'decline'
            }
          ]
        }
      ]
    };

    await this.sendNotification(notification);
  }

  async notifyExpertRequest(requestTitle: string, description: string, expertCriteria: ExpertCriteria, urgency: string = 'medium', requestedBy: string = 'MCP User'): Promise<void> {
    const criteriaText = this.formatExpertCriteria(expertCriteria);
    const urgencyEmoji = urgency === 'high' ? '🔥' : urgency === 'medium' ? '⚡' : '📋';
    
    const notification: SlackNotification = {
      text: `New Expert Sourcing Request: ${requestTitle}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${urgencyEmoji} Expert Sourcing Request: ${requestTitle}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Requested by:* ${requestedBy}`
            },
            {
              type: 'mrkdwn',
              text: `*Urgency:* ${urgency.toUpperCase()}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Description:*\n${description}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Expert Criteria:*\n${criteriaText}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🔍 Start Sourcing'
              },
              style: 'primary',
              value: 'start_sourcing'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '💬 Discuss Requirements'
              },
              value: 'discuss'
            }
          ]
        }
      ]
    };

    await this.sendNotification(notification);
  }

  private formatExpertCriteria(criteria: ExpertCriteria): string {
    const parts: string[] = [];

    if (criteria.currentCompany) {
      parts.push(`• Current Company: ${criteria.currentCompany}`);
    }

    if (criteria.recentCompanies && criteria.recentCompanies.length > 0) {
      parts.push(`• Recent Companies: ${criteria.recentCompanies.join(', ')}`);
    }

    if (criteria.currentTitle) {
      parts.push(`• Current Title: ${criteria.currentTitle}`);
    }

    if (criteria.recentTitles && criteria.recentTitles.length > 0) {
      parts.push(`• Recent Titles: ${criteria.recentTitles.join(', ')}`);
    }

    if (criteria.experienceYears) {
      parts.push(`• Experience: ${criteria.experienceYears}+ years`);
    }

    if (criteria.location) {
      parts.push(`• Location: ${criteria.location}`);
    }

    if (criteria.industryExperience && criteria.industryExperience.length > 0) {
      parts.push(`• Industry Experience: ${criteria.industryExperience.join(', ')}`);
    }

    return parts.length > 0 ? parts.join('\n') : 'No specific criteria provided';
  }

  private formatQuestionsPreview(questions: any[]): string {
    const preview = questions.slice(0, 3).map((q, i) => `${i + 1}. ${q.question}`).join('\n');
    const remaining = questions.length - 3;
    return remaining > 0 ? `${preview}\n... and ${remaining} more questions` : preview;
  }
}
