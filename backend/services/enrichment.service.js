const axios = require('axios');
const { scrapePage } = require('./realScraper.service');

async function enrichLead(lead) {
  const result = { email: '', emailSource: '', website: '', linkedIn: '' };

  if (!lead.url || lead.url.includes('google.com/search') || lead.url.includes('example.com')) {
    return result;
  }

  try {
    result.website = lead.url;

    const mainContent = await scrapePage(lead.url);
    const emails = extractEmails(mainContent);
    if (emails.length > 0) {
      result.email = emails[0];
      result.emailSource = 'scraped';
    }

    const linkedInUrl = extractLinkedIn(mainContent);
    if (linkedInUrl) result.linkedIn = linkedInUrl;

    // Try /contact page if no email yet
    if (!result.email) {
      try {
        const baseUrl = new URL(lead.url).origin;
        const contactContent = await scrapePage(`${baseUrl}/contact`);
        const contactEmails = extractEmails(contactContent);
        if (contactEmails.length > 0) {
          result.email = contactEmails[0];
          result.emailSource = 'scraped';
        }
        if (!result.linkedIn) {
          const li = extractLinkedIn(contactContent);
          if (li) result.linkedIn = li;
        }
      } catch { /* /contact doesn't exist */ }
    }

    // Hunter.io fallback — only if no email found via scraping
    if (!result.email && process.env.HUNTER_API_KEY) {
      const hunterEmail = await findEmailViaHunter(lead.url);
      if (hunterEmail) {
        result.email = hunterEmail.email;
        result.emailSource = 'hunter';
        result.emailConfidence = hunterEmail.confidence;
      }
    }
  } catch (err) {
    console.log(`[ENRICH] Failed for ${lead.url}: ${err.message}`);
  }

  return result;
}

async function findEmailViaHunter(url) {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, '');
    const res = await axios.get('https://api.hunter.io/v2/domain-search', {
      params: { domain, api_key: process.env.HUNTER_API_KEY, limit: 1 },
      timeout: 5000,
    });
    const emails = res.data?.data?.emails;
    if (emails?.length > 0) {
      return { email: emails[0].value, confidence: emails[0].confidence };
    }
  } catch { /* Hunter failed or quota exhausted */ }
  return null;
}

function extractEmails(text) {
  if (!text) return [];
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const found = text.match(emailRegex) || [];
  const junk = ['example.com', 'test.com', 'email.com', 'domain.com', 'yoursite.com', 'sentry.io', 'webpack.js'];
  return found.filter(e => !junk.some(j => e.includes(j)));
}

function extractLinkedIn(text) {
  if (!text) return '';
  const linkedInRegex = /https?:\/\/(www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+\/?/g;
  const matches = text.match(linkedInRegex) || [];
  return matches[0] || '';
}

async function batchEnrichLeads(leads, maxEnrich = 5) {
  const enrichable = leads.filter(l => l.url && !l.url.includes('google.com/search'));
  const toEnrich = enrichable.slice(0, maxEnrich);

  console.log(`[ENRICH] Enriching ${toEnrich.length} of ${leads.length} leads...`);

  for (const lead of toEnrich) {
    try {
      const enriched = await enrichLead(lead);
      lead.email = enriched.email || lead.email || '';
      lead.emailSource = enriched.emailSource || lead.emailSource || '';
      lead.emailConfidence = enriched.emailConfidence || lead.emailConfidence || null;
      lead.website = enriched.website || lead.website || '';
      lead.linkedIn = enriched.linkedIn || lead.linkedIn || '';
      console.log(`[ENRICH] ${lead.name}: email=${enriched.email || 'none'} (${enriched.emailSource || '-'}) | linkedin=${enriched.linkedIn || 'none'}`);
    } catch (err) {
      console.log(`[ENRICH] Skipping ${lead.name}: ${err.message}`);
    }
  }

  return leads;
}

module.exports = { enrichLead, batchEnrichLeads, extractEmails, extractLinkedIn };
