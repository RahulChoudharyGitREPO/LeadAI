const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract business leads from raw text content using AI
 * @param {string} content - The raw scraped text
 * @param {string} location - The target location for context
 * @returns {Promise<Array>} - List of structured lead objects
 */
async function extractLeadsFromText(content, location) {
  if (!content || content.length < 50) {
    console.log('[EXTRACT] Content too short, skipping.');
    return [];
  }

  const prompt = `
You are a lead extraction engine. Extract business leads from this scraped web content.
Target location: ${location || 'Any'}

Return a JSON object with a "leads" key containing an array. Each lead should have:
- name (Business Name)
- service (Main service they provide)
- location (Their address or area)
- phone (Contact number if found, otherwise "N/A")
- description (Short 1-line description)

If no leads are found, return: {"leads": []}

SCRAPED CONTENT:
${content.substring(0, 8000)}
  `;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    const leads = Array.isArray(parsed) ? parsed : (parsed.leads || parsed.results || []);
    console.log(`[EXTRACT] Extracted ${leads.length} leads`);
    return leads;
  } catch (error) {
    console.error('[EXTRACT] AI Error:', error.message);
    return [];
  }
}

/**
 * AI-powered lead scoring and intent detection
 * @param {object} lead - Lead object with name, service, location, description, website, etc.
 * @returns {object} - { aiScore, leadScore, intentSignals, opportunityLevel, reason }
 */
async function scoreAndAnalyzeLead(lead) {
  const defaults = {
    aiScore: 5,
    leadScore: 'Warm',
    intentSignals: [],
    opportunityLevel: 'medium',
    reason: ''
  };

  try {
    const prompt = `
You are a lead scoring AI. Analyze this business lead and rate it.

LEAD DATA:
- Name: ${lead.name}
- Service: ${lead.service || 'Unknown'}
- Location: ${lead.location || 'Unknown'}
- Phone: ${lead.phone || 'N/A'}
- Website: ${lead.website || 'None'}
- Email: ${lead.email || 'None'}
- Description: ${lead.description || 'No description'}

SCORING CRITERIA (rate 1-10):
- Business legitimacy and size (does it seem like a real, active business?)
- Digital presence (has website? has email? has phone?)
- Opportunity potential (could they benefit from services?)

INTENT SIGNALS to detect (return applicable ones):
- "needs_website" (if they have no website)
- "outdated_website" (if description mentions old/basic site)
- "no_online_presence" (no website + no email)
- "active_business" (has phone, has reviews, has address)
- "growing_business" (multiple locations, hiring, expanding)

Return ONLY valid JSON:
{
  "aiScore": <number 1-10>,
  "intentSignals": [<array of applicable signal strings>],
  "reason": "<one sentence explaining why this score>"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    const score = Math.max(1, Math.min(10, parseInt(parsed.aiScore) || 5));
    
    // Map numeric score to Hot/Warm/Cold
    let leadScore = 'Warm';
    if (score >= 8) leadScore = 'Hot';
    else if (score < 5) leadScore = 'Cold';

    // Map to opportunity level
    let opportunityLevel = 'medium';
    if (score >= 8) opportunityLevel = 'high';
    else if (score < 5) opportunityLevel = 'low';

    return {
      aiScore: score,
      leadScore,
      intentSignals: parsed.intentSignals || [],
      opportunityLevel,
      reason: parsed.reason || ''
    };
  } catch (error) {
    console.error('[SCORE] AI scoring failed:', error.message);
    return defaults;
  }
}

/**
 * Batch score multiple leads (sequential to avoid rate limits)
 */
async function batchScoreLeads(leads) {
  console.log(`[SCORE] Scoring ${leads.length} leads...`);
  for (const lead of leads) {
    const scoring = await scoreAndAnalyzeLead(lead);
    lead.aiScore = scoring.aiScore;
    lead.leadScore = scoring.leadScore;
    lead.intentSignals = scoring.intentSignals;
    lead.opportunityLevel = scoring.opportunityLevel;
    lead.reason = scoring.reason;
    console.log(`[SCORE] ${lead.name}: ${scoring.aiScore}/10 (${scoring.leadScore}) — ${scoring.reason}`);
  }
  return leads;
}

module.exports = { extractLeadsFromText, scoreAndAnalyzeLead, batchScoreLeads };
