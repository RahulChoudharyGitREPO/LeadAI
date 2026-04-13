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

module.exports = { extractLeadsFromText };
