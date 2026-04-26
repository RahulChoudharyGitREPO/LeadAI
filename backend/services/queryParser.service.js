const { OpenAI } = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Parses raw niche + location into normalized search terms, synonyms, intentModifiers, and location chain.
 * intentModifiers capture user intent words like "cheap", "best", "affordable" to build richer query variations.
 */
async function parseSearchQuery(niche, location) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `You are a search query normalizer for a global lead discovery system.

Given a business niche and location, return a JSON object.

Niche: "${niche}"
Location: "${location}"

Return ONLY this JSON (no explanation):
{
  "niche": "normalized business type (expand abbreviations — 'pg' → 'pg accommodation', 'ca' → 'chartered accountant')",
  "location": "cleaned location string (fix typos only)",
  "synonyms": ["2-3 alternative terms — different wording, same service"],
  "intentModifiers": ["0-2 intent words from the niche if present — e.g. 'cheap', 'budget', 'affordable', 'best', 'top', 'luxury'. Empty array if no modifiers."],
  "locationChain": ["exact location as given", "one level broader (strip sector/block/phase)", "city level", "region if applicable — e.g. Delhi NCR, Maharashtra"]
}

Examples:
- niche="cheap pg", location="greater noida sector 17a"
  → { "niche": "pg accommodation", "location": "greater noida sector 17a", "synonyms": ["hostel", "paying guest", "rooms for rent"], "intentModifiers": ["cheap", "budget"], "locationChain": ["greater noida sector 17a", "greater noida", "noida", "delhi ncr"] }

- niche="best jee coaching", location="delhi"
  → { "niche": "jee coaching center", "location": "delhi", "synonyms": ["iit jee coaching", "engineering entrance coaching", "test prep institute"], "intentModifiers": ["best", "top"], "locationChain": ["delhi"] }

- niche="cleaning services", location="mumbai andheri west"
  → { "niche": "home cleaning services", "location": "mumbai andheri west", "synonyms": ["housekeeping services", "maid services", "deep cleaning"], "intentModifiers": [], "locationChain": ["mumbai andheri west", "andheri mumbai", "mumbai"] }

- niche="affordable coaching", location="noida sector 62"
  → { "niche": "coaching center", "location": "noida sector 62", "synonyms": ["tuition center", "classes", "institute"], "intentModifiers": ["affordable", "low cost"], "locationChain": ["noida sector 62", "noida", "delhi ncr"] }`
      }],
      response_format: { type: 'json_object' },
      max_tokens: 280
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    console.log(`[QUERY_PARSER] niche="${parsed.niche}" | modifiers=[${parsed.intentModifiers?.join(', ')}] | synonyms=[${parsed.synonyms?.join(', ')}] | chain=[${parsed.locationChain?.join(' → ')}]`);
    return parsed;
  } catch (err) {
    console.error('[QUERY_PARSER] Failed:', err.message);
    return null;
  }
}

module.exports = { parseSearchQuery };
