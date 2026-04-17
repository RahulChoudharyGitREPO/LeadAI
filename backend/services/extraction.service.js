const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// ─── Per-Lead Data Quality Score (Fix #5) ────────────────────────────────────
function calcDataQuality(lead) {
  let score = 0;
  if (lead.phone && lead.phone !== 'N/A') score += 3;
  if (lead.email)   score += 2;
  if (lead.website) score += 2;
  if (lead.address || lead.location) score += 1;
  if (lead.description && lead.description.length > 50) score += 1;
  if (lead.linkedIn) score += 1;
  return Math.min(score, 10);
}

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

    let leadScore = 'Warm';
    if (score >= 8) leadScore = 'Hot';
    else if (score < 5) leadScore = 'Cold';

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
 * Batch score leads sequentially (avoids OpenAI rate limits).
 * Fix #10: optional onLeadScored callback — called immediately after each lead is scored
 * so the frontend receives leads progressively instead of all at once.
 */
async function batchScoreLeads(leads, onLeadScored) {
  console.log(`[SCORE] Scoring ${leads.length} leads...`);
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    const scoring = await scoreAndAnalyzeLead(lead);
    lead.aiScore = scoring.aiScore;
    lead.leadScore = scoring.leadScore;
    lead.intentSignals = scoring.intentSignals;
    lead.opportunityLevel = scoring.opportunityLevel;
    lead.reason = scoring.reason;
    lead.dataQuality = calcDataQuality(lead);
    console.log(`[SCORE] ${lead.name}: ${scoring.aiScore}/10 (${scoring.leadScore}) quality=${lead.dataQuality} — ${scoring.reason}`);
    if (onLeadScored) onLeadScored(lead, i);
  }
  return leads;
}

module.exports = { extractLeadsFromText, scoreAndAnalyzeLead, batchScoreLeads };
