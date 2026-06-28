import { Injectable, InternalServerErrorException, ServiceUnavailableException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { OpportunityType } from '@prisma/client';

const TYPE_LABELS: Record<OpportunityType, string> = {
  JOB_OPPORTUNITY: 'Job Opportunity',
  TALENT_PROFILE: 'Talent Profile',
  CO_FOUNDER_OPPORTUNITY: 'Co-Founder Opportunity',
  CO_FOUNDER_PROFILE: 'Co-Founder Profile',
  BUSINESS_IDEA: 'Business Idea',
  SUPPORT_OFFER: 'Support Offer',
  SERVICE_LISTING: 'Service Listing',
  SERVICE_REQUEST: 'Service Request',
  DEAL_FLOW: 'Deal Flow',
  INVESTOR_THESIS: 'Investor Thesis',
  INVESTOR_PROFILE: 'Investor Profile',
  FUNDING_OPPORTUNITY: 'Funding Opportunity',
  EVENT: 'Event',
  CALL_FOR_STARTUPS: 'Call for Startups',
  MENTORSHIP_BA_OFFER: 'Mentorship / BA Offer',
  PROJECT_SEEKING_SUPPORT: 'Project Seeking Support',
  VENTURE_PROGRAM: 'Venture Program',
  CHILL_WORK_SPOT: 'Chill Work Spot',
  MARKET_ADVISOR: 'Market Advisor',
};

export interface GeneratedOpportunity {
  name: string;
  punchline: string;
  description: string;
  tags: string[];
}

@Injectable()
export class AiService {
  private readonly client: Anthropic | null;

  constructor() {
    const key = process.env.ANTHROPIC_API_KEY;
    this.client = key ? new Anthropic({ apiKey: key }) : null;
  }

  /**
   * Generates a structured opportunity draft using Claude.
   *
   * Returns name, punchline, description and tags based on the opportunity
   * type and a brief user-provided context.
   *
   * @throws ServiceUnavailableException when ANTHROPIC_API_KEY is not configured.
   * @throws InternalServerErrorException when the API call fails or returns invalid JSON.
   */
  async generateOpportunity(
    type: OpportunityType,
    context: string,
  ): Promise<GeneratedOpportunity> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI generation is not configured. Set ANTHROPIC_API_KEY to enable it.',
      );
    }

    const typeLabel = TYPE_LABELS[type] ?? type;

    const systemPrompt = `You are a professional content writer for D-Fund, an African startup ecosystem platform.
Your task is to write compelling, concise opportunity listings.
Always respond with valid JSON only — no markdown, no commentary, no code fences.

JSON schema (all fields required):
{
  "name": string,        // clear, specific title — max 80 characters
  "punchline": string,   // one-line hook that captures attention — max 120 characters
  "description": string, // well-structured opportunity description — 200 to 400 words, using plain paragraphs (no markdown)
  "tags": string[]       // 3 to 5 relevant keyword tags (lowercase)
}`;

    const safeContext = context.replace(/[<>{}`]/g, '').slice(0, 1000).trim();
    const userPrompt = `Opportunity type: ${typeLabel}
User context: ${safeContext}

Write a compelling listing for this opportunity.`;

    let raw: string;
    try {
      // P1 — timeout 30 s pour ne pas bloquer la requête HTTP indéfiniment
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      const message = await this.client.messages.create(
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{ role: 'user', content: userPrompt }],
          system: systemPrompt,
        },
        { signal: controller.signal },
      );
      clearTimeout(timeout);

      const block = message.content[0];
      if (block.type !== 'text') {
        throw new Error('Unexpected response type from AI');
      }
      raw = block.text.trim();
    } catch (err: any) {
      throw new InternalServerErrorException(
        `AI generation failed: ${err.message ?? 'unknown error'}`,
      );
    }

    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    let parsed: GeneratedOpportunity;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new InternalServerErrorException('AI returned invalid JSON. Please try again.');
    }

    // Validate and sanitise the response
    return {
      name: String(parsed.name ?? '').slice(0, 80),
      punchline: String(parsed.punchline ?? '').slice(0, 120),
      description: String(parsed.description ?? ''),
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.map((t) => String(t)).slice(0, 5)
        : [],
    };
  }
}
