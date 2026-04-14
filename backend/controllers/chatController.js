const { OpenAI } = require('openai');
const Lead = require('../models/Lead');
const { searchWeb } = require('../services/search.service');
const { scrapePage } = require('../services/realScraper.service');
const { extractLeadsFromText, batchScoreLeads } = require('../services/extraction.service');
const { cleanAndDeduplicateLeads } = require('../services/cleaning.service');
const { batchEnrichLeads } = require('../services/enrichment.service');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const getUserId = (req) => req.get('x-user-id') || req.body.userId;

const SYSTEM_PROMPT = `
You are an advanced AI Sales & Discovery Assistant for an AI Customer Conversion System.

CAPABILITIES:
1. INTERNAL SEARCH: Use 'query_database_leads' to find existing leads in the system.
2. WEB DISCOVERY: Use 'discover_leads_on_web' to search for potential new leads from the REAL web.
   - You MUST pass the EXACT location the user mentions (e.g. "Kolkata", "Mumbai", "New York").
   - If user says "near me", ask them for their city first.
   - The search will hit Google and scrape real websites.
3. LEAD CAPTURE: Collect Service, Location, and Phone for new leads.

RULES:
- Always pass the user's exact location to the discovery tool.
- NEVER list the discovered leads individually in your text response. Do NOT repeat names, phones, or URLs.
- The UI will render the visual lead cards automatically below your message.
- Just output a short, single sentence summary like: "I found several leads in [Location]. You can review them below and click 'Save Lead' to add them to your CRM."
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
          
          try {
            // 1. Search Google for URLs and Local Data
            const searchResults = await searchWeb(args.niche, args.location, args.requiresNoWebsite);
            console.log(`[CHAT] Search returned ${searchResults.length} results`);
            
            const items = searchResults.slice(0, 15); // Process up to 15 items
            const discoveredLeads = [];
            let scrapeCount = 0;
            const MAX_SCRAPES = 3; // Only scrape up to 3 organic sites to stay fast

            // 2. Process search results via Fast Path (Maps) or Slow Path (Scrape)
            for (const item of items) {
              console.log(`[CHAT] Processing: ${item.title}`);
              
              let extracted = [];

              if (item.isLocal) {
                // FAST PATH: It's a Maps/Local result, no scraping required!
                console.log(`[CHAT] Fast Path (Local Result) used for ${item.title}`);
                extracted = [{
                  name: item.title,
                  service: args.niche,
                  location: item.address || args.location,
                  phone: item.phone || 'N/A',
                  description: item.snippet || `Business located at ${item.address}`
                }];
              } else {
                // SLOW PATH: Try scraping organic website (limited)
                if (scrapeCount < MAX_SCRAPES) {
                  try {
                    scrapeCount++;
                    const content = await scrapePage(item.link);
                    if (content && content.length > 100) {
                      extracted = await extractLeadsFromText(content, args.location);
                    }
                  } catch (scrapeErr) {
                    console.log(`[CHAT] Scraping failed for ${item.link}, using search data instead`);
                  }
                } else {
                  console.log(`[CHAT] Scrape limit reached — using search snippet for ${item.title}`);
                }

                // If scraping didn't find leads, create one from search result data
                if (extracted.length === 0) {
                  extracted = [{
                    name: item.title.replace(/ - .*$/, '').replace(/\|.*$/, '').trim(),
                    service: args.niche,
                    location: item.address || args.location,
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

            // Step 3: AI Score + Intent Detection
            if (io) io.to(userId).emit('pipeline_progress', { step: 'scoring', count: cleanedLeads.length });
            await batchScoreLeads(cleanedLeads);

            // Emit final results
            for (const lead of cleanedLeads) {
              if (io) io.to(userId).emit('lead_stream', lead);
            }
            if (io) io.to(userId).emit('pipeline_progress', { step: 'done', count: cleanedLeads.length });
            
            result = cleanedLeads;
            console.log(`[CHAT] Discovery complete. Total leads: ${result.length}`);
          } catch (discoveryErr) {
            console.error('[CHAT] Discovery pipeline error:', discoveryErr.message);
            result = [{ name: 'Discovery Error', service: args.niche, location: args.location, phone: 'N/A', notes: [{ text: discoveryErr.message }] }];
          }
        }

        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolCall.function.name,
          content: JSON.stringify(result)
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
