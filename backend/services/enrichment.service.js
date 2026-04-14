const { scrapePage } = require('./realScraper.service');

/**
 * Enrich a lead by scraping its website for contact info
 * @param {object} lead - Lead object with at least a url field
 * @returns {object} - Enriched lead data { email, website, linkedIn }
 */
async function enrichLead(lead) {
  const result = { email: '', website: '', linkedIn: '' };
  
  if (!lead.url || lead.url.includes('google.com/search') || lead.url.includes('example.com')) {
    return result;
  }

  try {
    result.website = lead.url;
    
    // Scrape the main page
    const mainContent = await scrapePage(lead.url);
    
    // Extract emails from page content
    const emails = extractEmails(mainContent);
    if (emails.length > 0) {
      result.email = emails[0]; // Take the first valid email
    }
    
    // Extract LinkedIn URLs
    const linkedInUrl = extractLinkedIn(mainContent);
    if (linkedInUrl) {
      result.linkedIn = linkedInUrl;
    }

    // If no email found on main page, try /contact page
    if (!result.email) {
      try {
        const baseUrl = new URL(lead.url).origin;
        const contactContent = await scrapePage(`${baseUrl}/contact`);
        const contactEmails = extractEmails(contactContent);
        if (contactEmails.length > 0) {
          result.email = contactEmails[0];
        }
        if (!result.linkedIn) {
          const li = extractLinkedIn(contactContent);
          if (li) result.linkedIn = li;
        }
      } catch {
        // /contact page doesn't exist, that's fine
      }
    }
  } catch (err) {
    console.log(`[ENRICH] Failed for ${lead.url}: ${err.message}`);
  }

  return result;
}

/**
 * Extract email addresses from text content
 */
function extractEmails(text) {
  if (!text) return [];
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const found = text.match(emailRegex) || [];
  
  // Filter out common junk emails
  const junk = ['example.com', 'test.com', 'email.com', 'domain.com', 'yoursite.com', 'sentry.io', 'webpack.js'];
  return found.filter(e => !junk.some(j => e.includes(j)));
}

/**
 * Extract LinkedIn URL from text content
 */
function extractLinkedIn(text) {
  if (!text) return '';
  const linkedInRegex = /https?:\/\/(www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+\/?/g;
  const matches = text.match(linkedInRegex) || [];
  return matches[0] || '';
}

/**
 * Batch enrich multiple leads (with concurrency limit)
 * @param {Array} leads - Array of lead objects
 * @param {number} maxEnrich - Max leads to enrich (default 5)
 * @returns {Array} - Enriched leads
 */
async function batchEnrichLeads(leads, maxEnrich = 5) {
  const enrichable = leads.filter(l => l.url && !l.url.includes('google.com/search'));
  const toEnrich = enrichable.slice(0, maxEnrich);
  
  console.log(`[ENRICH] Enriching ${toEnrich.length} of ${leads.length} leads...`);
  
  for (const lead of toEnrich) {
    try {
      const enriched = await enrichLead(lead);
      lead.email = enriched.email || lead.email || '';
      lead.website = enriched.website || lead.website || '';
      lead.linkedIn = enriched.linkedIn || lead.linkedIn || '';
      console.log(`[ENRICH] ${lead.name}: email=${enriched.email || 'none'} | linkedin=${enriched.linkedIn || 'none'}`);
    } catch (err) {
      console.log(`[ENRICH] Skipping ${lead.name}: ${err.message}`);
    }
  }
  
  return leads;
}

module.exports = { enrichLead, batchEnrichLeads, extractEmails, extractLinkedIn };
