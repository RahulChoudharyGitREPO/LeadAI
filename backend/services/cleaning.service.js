/**
 * Data Cleaning Service
 * Normalizes, validates, and deduplicates lead data
 */

function normalizePhone(phone) {
  if (!phone || phone === 'N/A') return 'N/A';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.length < 7) return 'N/A';
  if (cleaned.length >= 10) {
    if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) return `+91${cleaned}`;
    if (cleaned.length > 10) return `+${cleaned}`;
  }
  return cleaned;
}

function validateEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed) ? trimmed : '';
}

function cleanBusinessName(name) {
  if (!name) return '';
  return name
    .replace(/\s*[-–|].*?(Reviews?|Yelp|Google Maps?|Facebook|Ratings?).*$/i, '')
    .replace(/\s*\.\.\.\s*$/, '')
    .replace(/\s*[-–|]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Fuzzy Dedup Helpers (Fix #4) ────────────────────────────────────────────

function normalizeForFuzzy(name) {
  return (name || '').toLowerCase()
    .replace(/\b(pg|hostel|paying guest|accommodation|pvt|ltd|llp|inc|rooms?|services?|center|centre|institute)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function normalizeLocation(loc) {
  return (loc || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Returns true only if two leads are the same business.
 * Fuzzy name similarity alone is NOT enough — requires location or phone confirmation
 * to prevent false positives like "Raj PG" vs "Rajesh PG".
 */
function isFuzzyDuplicate(leadA, leadB) {
  const na = normalizeForFuzzy(leadA.name);
  const nb = normalizeForFuzzy(leadB.name);
  if (!na || !nb) return false;

  // Exact name match after stripping common suffixes → always safe to merge
  if (na === nb) return true;

  // Fuzzy: one name contains the other at 75%+ length ratio
  const shorter = na.length <= nb.length ? na : nb;
  const longer  = na.length <= nb.length ? nb : na;
  const nameSimilar = longer.includes(shorter) && (shorter.length / longer.length) >= 0.75;
  if (!nameSimilar) return false;

  // Name is only similar — require same phone OR same city to confirm same business
  const phoneA = normalizePhone(leadA.phone);
  const phoneB = normalizePhone(leadB.phone);
  const samePhone = phoneA !== 'N/A' && phoneB !== 'N/A' && phoneA === phoneB;

  const locA = normalizeLocation(leadA.location || leadA.address);
  const locB = normalizeLocation(leadB.location || leadB.address);
  const sameCity = locA.length > 2 && locB.length > 2 && (locA.includes(locB) || locB.includes(locA));

  return samePhone || sameCity;
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function deduplicateLeads(leads) {
  const unique = [];

  for (const lead of leads) {
    const normPhone = normalizePhone(lead.phone);
    let isDupe = false;

    for (const existing of unique) {
      // Phone match (strongest signal)
      if (normPhone !== 'N/A' && normalizePhone(existing.phone) === normPhone) {
        isDupe = true;
        mergeLeadData(existing, lead);
        break;
      }
      // Fuzzy name match — requires location or phone confirmation (prevents "Raj PG" vs "Rajesh PG" false positives)
      if (isFuzzyDuplicate(existing, lead)) {
        isDupe = true;
        mergeLeadData(existing, lead);
        break;
      }
    }

    if (!isDupe) unique.push(lead);
  }

  return unique;
}

function mergeLeadData(primary, duplicate) {
  if ((!primary.phone || primary.phone === 'N/A') && duplicate.phone && duplicate.phone !== 'N/A') {
    primary.phone = duplicate.phone;
  }
  if (!primary.email && duplicate.email) primary.email = duplicate.email;
  if (!primary.website && duplicate.website) primary.website = duplicate.website;
  if (!primary.description && duplicate.description) primary.description = duplicate.description;
}

function cleanLead(lead) {
  return {
    ...lead,
    name: cleanBusinessName(lead.name),
    phone: normalizePhone(lead.phone),
    email: validateEmail(lead.email || ''),
  };
}

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
