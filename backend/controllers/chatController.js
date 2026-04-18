const { OpenAI } = require('openai');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { searchWeb } = require('../services/search.service');
const { parseSearchQuery } = require('../services/queryParser.service');
const { scrapePage } = require('../services/realScraper.service');
const { extractLeadsFromText, batchScoreLeads } = require('../services/extraction.service');
const { cleanAndDeduplicateLeads } = require('../services/cleaning.service');
const { batchEnrichLeads } = require('../services/enrichment.service');
const { checkSubscription } = require('../middleware/checkSubscription');
const PLANS = require('../config/plans');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getUserId = (req) => req.get('x-user-id') || req.body.userId;

const SYSTEM_PROMPT = `
You are an advanced AI Business Discovery Assistant for a Market Research and Business Intelligence Platform.

CAPABILITIES:
1. INTERNAL SEARCH: Use 'query_database_leads' to find existing business listings in the system.
2. WEB DISCOVERY: Use 'discover_leads_on_web' to search for local business listings and insights from the REAL web.
   - NEVER ask the user to confirm or clarify a location. Always use your best interpretation and call the tool immediately.
   - Auto-correct typos in location names (e.g. "boakro" → "Bokaro", "mumabi" → "Mumbai") without mentioning the correction.
   - If the system context includes "User location: [city]", use that city when the user says "near me" or similar.
   - The search will analyse Google and real websites to gather business information.
3. BUSINESS CAPTURE: Collect Service, Location, and Contact info for discovered businesses.

RULES:
- NEVER ask for clarification on any location name. Silently fix typos and search immediately.
- Always pass the user's best-interpreted location to the discovery tool.
- NEVER list the discovered businesses individually in your text response. Do NOT repeat names, phones, or URLs.
- The UI will render the visual business cards automatically below your message.
- Just output a short, single sentence summary like: "I found several businesses in [Location]. You can review them below and save the ones relevant to your research."
- ONLY base your response on what the tool actually returned. NEVER invent counts, names, or availability.
- If the tool returns { found: 0, nextFallback: "X" }, say: "I couldn't find [niche] businesses in [location]. Want me to search in [X] instead? Just say yes."
- If the tool returns { found: 0, nextFallback: null }, say: "I couldn't find any [niche] businesses after trying multiple query variations and location levels."
- If the tool returns { found: N, searchNote: "..." }, include the searchNote naturally — e.g. "I found [N] [niche] businesses. Note: results are from [broader location] since the specific area had no listings."
- If the tool returns { confidence: "low" }, add: "Results may be limited for this area."
- If the tool returns { overallDataQuality } >= 7, add: "These results have strong contact data." If < 4, add: "Limited contact data is available for these results."
- If the tool returns { type: "TIMEOUT" }, say: "The search is taking longer than usual. Please try again in a moment."
- If the tool returns { type: "API_ERROR" }, say: "I hit a technical issue while searching. Please try again in a moment."
- If the tool returns { type: "RATE_LIMITED" }, say: "Search limit reached — please wait a minute and try again."
- If the tool returns { type: "BLOCKED" }, say: "Search is temporarily unavailable. Please try again shortly."
- NEVER say "let me try again" or "I encountered an issue" on your own — only use the messages above.
`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "query_database_leads",
      description: "Search for existing leads in the internal database.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["new", "contacted", "booked", "closed", "all"] },
          score: { type: "string", enum: ["Hot", "Warm", "Cold", "all"] },
          query: { type: "string" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "discover_leads_on_web",
      description: "Search Google and scrape real websites to find business leads. ALWAYS include the user's exact location.",
      parameters: {
        type: "object",
        properties: {
          niche: { type: "string", description: "The business type (e.g. 'coaching centers', 'cleaning services')" },
          location: { type: "string", description: "The EXACT city/area the user wants (e.g. 'Kolkata', 'Mumbai', 'London')" },
          requiresNoWebsite: { type: "boolean", description: "Set to true ONLY if the user EXPLICITLY asks for businesses that do NOT have a website or online presence." }
        },
        required: ["niche", "location"]
      }
    }
  }
];

const processChat = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'User is required' });
    }

    const { messages } = req.body;
    const io = req.app.get('io');

    console.log('[CHAT] Processing message...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      tools: TOOLS,
    });

    const aiMessage = response.choices[0].message;

    if (aiMessage.tool_calls) {
      const toolResults = [];

      for (const toolCall of aiMessage.tool_calls) {
        let result = [];
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`[CHAT] Tool called: ${toolCall.function.name}`, args);

        let toolError = null;
        let toolErrorType = 'API_ERROR';
        let usedLocation = args.location;
        let originalLocation = args.location;
        let confidence = 'high';
        let nextFallback = null;

        if (toolCall.function.name === 'query_database_leads') {
          const filter = { userId };
          if (args.status && args.status !== 'all') filter.status = args.status;
          if (args.score && args.score !== 'all') filter.leadScore = args.score;
          if (args.query) {
            filter.$or = [
              { name: { $regex: args.query, $options: 'i' } },
              { service: { $regex: args.query, $options: 'i' } }
            ];
          }
          result = await Lead.find(filter).sort({ createdAt: -1 });
          console.log(`[CHAT] DB query returned ${result.length} leads`);
        } 
        
        else if (toolCall.function.name === 'discover_leads_on_web') {
          console.log(`[CHAT] Starting web discovery: niche="${args.niche}" location="${args.location}"`);

          // Subscription gate — blocks free/expired/limit-reached users
          const subCheck = await checkSubscription(userId);
          if (!subCheck.allowed) {
            const message = subCheck.reason === 'SUBSCRIPTION_REQUIRED'
              ? 'Please subscribe to use web discovery.'
              : subCheck.reason === 'SUBSCRIPTION_EXPIRED'
              ? 'Your plan has expired. Please renew to continue.'
              : `Search limit reached (${subCheck.searchesUsed}/${subCheck.searchLimit}). Upgrade to search more.`;
            return res.status(402).json({ error: subCheck.reason, message, plans: PLANS, searchesRemaining: 0 });
          }

          try {
            // 1. Query Understanding — normalize niche, get synonyms + location fallback chain
            const parsed = await parseSearchQuery(args.niche, args.location);
            const searchNiche = parsed?.niche || args.niche;
            const searchLocation = parsed?.location || args.location;
            const synonyms = parsed?.synonyms || [];
            const intentModifiers = parsed?.intentModifiers || [];
            const locationChain = parsed?.locationChain || [args.location];

            // 2. Multi-query search with synonyms, intentModifiers + location fallback chain
            const searchData = await searchWeb(searchNiche, searchLocation, args.requiresNoWebsite, synonyms, locationChain, intentModifiers);
            ({ usedLocation, originalLocation, confidence, nextFallback } = searchData);
            const searchResults = searchData.results;
            console.log(`[CHAT] Search returned ${searchResults.length} results (confidence: ${confidence}, usedLocation: "${usedLocation}")`);

            const items = searchResults.slice(0, subCheck.resultsLimit || 20);
            const discoveredLeads = [];
            let scrapeCount = 0;
            const MAX_SCRAPES = 3; // Only scrape up to 3 organic sites to stay fast

            // 2. Process search results via Fast Path (Maps) or Slow Path (Scrape)
            for (const item of items) {
              console.log(`[CHAT] Processing: ${item.title}`);
              
              let extracted = [];

              if (item.isLocal) {
                // FAST PATH: Maps/Local result — no scraping required
                console.log(`[CHAT] Fast Path (Local Result) used for ${item.title}`);
                extracted = [{
                  name: item.title,
                  service: searchNiche,
                  location: item.address || usedLocation,
                  phone: item.phone || 'N/A',
                  description: item.snippet || `Business located at ${item.address}`
                }];
              } else {
                // SLOW PATH: Scrape organic website (capped at MAX_SCRAPES)
                if (scrapeCount < MAX_SCRAPES) {
                  try {
                    scrapeCount++;
                    const content = await scrapePage(item.link);
                    if (content && content.length > 100) {
                      extracted = await extractLeadsFromText(content, usedLocation);
                    }
                  } catch (scrapeErr) {
                    console.log(`[CHAT] Scraping failed for ${item.link}, using search data instead`);
                  }
                } else {
                  console.log(`[CHAT] Scrape limit reached — using search snippet for ${item.title}`);
                }

                if (extracted.length === 0) {
                  extracted = [{
                    name: item.title.replace(/ - .*$/, '').replace(/\|.*$/, '').trim(),
                    service: searchNiche,
                    location: item.address || usedLocation,
                    phone: item.phone || 'N/A',
                    description: item.snippet
                  }];
                }
              }

              // Flag each found lead and don't auto-save
              for (const lead of extracted) {
                if (!lead.name) continue;

                // Deduplication check
                const existing = await Lead.findOne({
                  userId,
                  $or: [
                    { name: lead.name }, 
                    { phone: { $ne: 'N/A', $eq: lead.phone } }
                  ] 
                });

                if (!existing) {
                  const finalLeadData = {
                    name: lead.name,
                    service: lead.service || args.niche,
                    location: lead.location || args.location,
                    phone: lead.phone || 'N/A',
                    email: lead.email || '',
                    website: lead.website || '',
                    linkedIn: lead.linkedIn || '',
                    description: lead.description || 'Potential lead discovered via Web.',
                    source: 'web',
                    status: 'new',
                    leadScore: 'Warm',
                    url: item.link,
                    isDuplicate: false,
                    isSaved: false
                  };
                  discoveredLeads.push(finalLeadData);
                } else {
                  const finalLeadData = {
                    ...existing._doc,
                    url: item.link,
                    isDuplicate: true,
                    isSaved: true
                  };
                  discoveredLeads.push(finalLeadData);
                }
              }
            }

            // === INTELLIGENCE PIPELINE ===
            // Step 1: Clean & Deduplicate
            if (io) io.to(userId).emit('pipeline_progress', { step: 'cleaning', count: discoveredLeads.length });
            const cleanedLeads = cleanAndDeduplicateLeads(discoveredLeads);
            console.log(`[CHAT] After cleaning: ${cleanedLeads.length} leads (from ${discoveredLeads.length})`);

            // Step 2: Enrich (scrape contact pages for email/LinkedIn)
            if (io) io.to(userId).emit('pipeline_progress', { step: 'enriching', count: cleanedLeads.length });
            await batchEnrichLeads(cleanedLeads, 5);

            // Step 3: AI Score + Intent Detection — Fix #10: emit each lead as soon as scored
            if (io) io.to(userId).emit('pipeline_progress', { step: 'scoring', count: cleanedLeads.length });
            const stableId = (l) => l.phone && l.phone !== 'N/A' ? l.phone : l.website || `${l.name}-${l.location}`;
            await batchScoreLeads(cleanedLeads, (lead, index) => {
              if (io) io.to(userId).emit('lead_stream', { ...lead, id: stableId(lead), order: index });
            });
            if (io) io.to(userId).emit('pipeline_progress', { step: 'done', count: cleanedLeads.length });

            // Emit final re-ranked order by aiScore + (dataQuality * 0.5)
            if (io) {
              const reranked = [...cleanedLeads].sort((a, b) =>
                ((b.aiScore || 0) + (b.dataQuality || 0) * 0.5) - ((a.aiScore || 0) + (a.dataQuality || 0) * 0.5)
              );
              io.to(userId).emit('lead_rerank', reranked.map((l, i) => ({
                id: stableId(l),
                order: i,
                finalScore: (l.aiScore || 0) + (l.dataQuality || 0) * 0.5
              })));
            }

            result = cleanedLeads;
            console.log(`[CHAT] Discovery complete. Total leads: ${result.length}`);
          } catch (discoveryErr) {
            console.error('[CHAT] Discovery pipeline error:', discoveryErr.message);
            toolError = discoveryErr.message;
            toolErrorType = discoveryErr.failureType || 'API_ERROR';
            result = [];
            if (io) io.to(userId).emit('pipeline_progress', { step: 'error', message: discoveryErr.message });
          }
        }

        let toolContent;
        if (toolError) {
          toolContent = JSON.stringify({
            type: toolErrorType,
            found: 0,
            message: 'Discovery pipeline encountered a technical error.'
          });
        } else if (result.length === 0) {
          toolContent = JSON.stringify({
            found: 0,
            type: 'NO_RESULTS',
            nextFallback
          });
        } else {
          const searchNote = usedLocation !== originalLocation
            ? `Results are from "${usedLocation}" — "${originalLocation}" had no listings, so I searched the broader area.`
            : null;
          const overallDataQuality = result.length > 0
            ? Math.round(result.reduce((sum, l) => sum + (l.dataQuality || 0), 0) / result.length)
            : 0;
          toolContent = JSON.stringify({
            found: result.length,
            confidence,
            overallDataQuality,
            ...(searchNote ? { searchNote } : {}),
            leads: result
          });
        }

        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolCall.function.name,
          content: toolContent
        });
      }

      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages, aiMessage, ...toolResults]
      });

      return res.json({ message: finalResponse.choices[0].message.content, data: toolResults });
    }

    res.json({ message: aiMessage.content });
  } catch (error) {
    console.error('[CHAT] Fatal Error:', error.message);
    res.status(500).json({ error: `Chat failed: ${error.message}` });
  }
};

const saveLead = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'User is required' });
    }

    const { name, service, date, location, phone, leadScore, status, notes } = req.body;
    const newLead = new Lead({
      userId,
      name, service, date, location,
      phone: phone || 'N/A',
      status: status || 'new',
      leadScore: leadScore || 'Warm',
      notes: notes ? (Array.isArray(notes) ? notes : [{ text: notes }]) : [{ text: 'Lead captured via AI' }]
    });
    await newLead.save();
    res.status(201).json(newLead);
  } catch (error) {
    console.error('Save Lead Error:', error);
    res.status(500).json({ error: 'Failed to save lead' });
  }
};

const generatePitch = async (req, res) => {
  try {
    const { leadName, service, description, location } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a professional sales outreach assistant. Write a short, engaging one-sentence WhatsApp message to a potential lead. The tone should be helpful and not spammy." 
        },
        { 
          role: "user", 
          content: `Write a hyper-personalized one-sentence WhatsApp pitch for a business lead.
          Business Name: ${leadName}
          Service: ${service}
          Location: ${location}
          Extra Context: ${description}
          
          The pitch should mention finding them online and being impressed by their work in ${location}. Keep it under 25 words.` 
        }
      ],
    });

    res.json({ pitch: response.choices[0].message.content });
  } catch (error) {
    console.error('Generate Pitch Error:', error);
    res.status(500).json({ error: 'Failed to generate pitch' });
  }
};

module.exports = {
  processChat,
  saveLead,
  generatePitch
};
