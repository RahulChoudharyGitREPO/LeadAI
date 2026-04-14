/**
 * Data Cleaning Service
 * Normalizes, validates, and deduplicates lead data
 */

/**
 * Normalize a phone number — strip non-digits, handle country codes
 */
function normalizePhone(phone) {
  if (!phone || phone === 'N/A') return 'N/A';
  
  // Strip everything except digits and leading +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove leading + for comparison
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  
  // If it's too short, it's not a real phone
  if (cleaned.length < 7) return 'N/A';
  
  // Add + back for international format
  if (cleaned.length >= 10) {
    // Indian numbers (10 digits starting with 6-9)
    if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
      return `+91${cleaned}`;
    }
    // Already has country code
    if (cleaned.length > 10) {
      return `+${cleaned}`;
    }
  }
  
  return cleaned;
}

/**
 * Validate email format
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed) ? trimmed : '';
}

/**
 * Clean business name — strip junk suffixes from scraping
 */
function cleanBusinessName(name) {
  if (!name) return '';
  return name
    .replace(/\s*[-–|].*?(Reviews?|Yelp|Google Maps?|Facebook|Ratings?).*$/i, '')
    .replace(/\s*\.\.\.\s*$/, '')
    .replace(/\s*[-–|]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deduplicate leads by fuzzy name match + exact phone match
 */
function deduplicateLeads(leads) {
  const seen = new Map(); // normalized name -> lead
  const result = [];

  for (const lead of leads) {
    const normName = (lead.name || '').toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
    const normPhone = normalizePhone(lead.phone);
    
    // Check for duplicates
    let isDupe = false;
    
    for (const [existingName, existingLead] of seen) {
      // Exact name match
      if (normName === existingName) {
        isDupe = true;
        // Merge: keep the one with more data
        mergeLeadData(existingLead, lead);
        break;
      }
      
      // Phone match (if both have real phones)
      if (normPhone !== 'N/A' && normalizePhone(existingLead.phone) === normPhone) {
        isDupe = true;
        mergeLeadData(existingLead, lead);
        break;
      }
    }
    
    if (!isDupe) {
      seen.set(normName, lead);
      result.push(lead);
    }
  }

  return result;
}

/**
 * Merge data from a duplicate into the primary lead (keep best data)
 */
function mergeLeadData(primary, duplicate) {
  if ((!primary.phone || primary.phone === 'N/A') && duplicate.phone && duplicate.phone !== 'N/A') {
    primary.phone = duplicate.phone;
  }
  if (!primary.email && duplicate.email) {
    primary.email = duplicate.email;
  }
  if (!primary.website && duplicate.website) {
    primary.website = duplicate.website;
  }
  if (!primary.description && duplicate.description) {
    primary.description = duplicate.description;
  }
}

/**
 * Clean a single lead object
 */
function cleanLead(lead) {
  return {
    ...lead,
    name: cleanBusinessName(lead.name),
    phone: normalizePhone(lead.phone),
    email: validateEmail(lead.email || ''),
  };
}

/**
 * Full cleaning pipeline: clean each lead, then deduplicate
 */
function cleanAndDeduplicateLeads(leads) {
  const cleaned = leads.map(cleanLead).filter(l => l.name && l.name.length > 1);
  return deduplicateLeads(cleaned);
}

module.exports = {
  normalizePhone,
  validateEmail,
  cleanBusinessName,
  deduplicateLeads,
  cleanLead,
  cleanAndDeduplicateLeads
};
