const axios = require('axios');

const SERPAPI_BASE = 'https://serpapi.com/search';

// ─── Fix #9: In-Memory Cache (20min TTL, max 100 entries) ────────────────────
const searchCache = new Map();
const CACHE_TTL = 20 * 60 * 1000;
const CACHE_MAX = 100;

function cacheKey(niche, location, intentModifiers = []) {
  return JSON.stringify({
    niche: niche.toLowerCase().trim(),
    location: location.toLowerCase().trim(),
    modifiers: [...intentModifiers].map(m => m.toLowerCase().trim()).sort()
  });
}
function getCache(key) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { searchCache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  if (searchCache.size >= CACHE_MAX) searchCache.delete(searchCache.keys().next().value);
  searchCache.set(key, { data, timestamp: Date.now() });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function searchWithRetry(params, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await axios.get(SERPAPI_BASE, { params, timeout: 15000 });
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const delay = 600 * (attempt + 1);
      console.log(`[SEARCH] Attempt ${attempt + 1} failed (${err.message}), retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function mapLocalResults(places, fallbackLocation) {
  return (places || []).map(r => ({
    title: r.title,
    link: r.links?.website || `https://www.google.com/search?q=${encodeURIComponent(r.title + ' ' + fallbackLocation)}`,
    snippet: [r.type, r.address, r.rating ? `Rating: ${r.rating}` : null].filter(Boolean).join(' | '),
    phone: r.phone || 'N/A',
    address: r.address || '',
    isLocal: true,
    hasWebsite: !!r.links?.website,
    rating: r.rating || 0
  }));
}

function mapOrganicResults(results) {
  return (results || []).map(r => ({
    title: r.title,
    link: r.link,
    snippet: r.snippet || '',
    phone: 'N/A',
    address: '',
    isLocal: false,
    hasWebsite: true,
    rating: 0
  }));
}

function mapMapsResults(results, fallbackLocation) {
  return (results || []).map(r => ({
    title: r.title,
    link: r.website || `https://www.google.com/search?q=${encodeURIComponent(r.title + ' ' + fallbackLocation)}`,
    snippet: [r.type, r.address, r.rating ? `Rating: ${r.rating}` : null, r.reviews ? `Reviews: ${r.reviews}` : null].filter(Boolean).join(' | '),
    phone: r.phone || 'N/A',
    address: r.address || '',
    isLocal: true,
    hasWebsite: !!r.website,
    rating: r.rating || 0
  }));
}

function rankResults(results) {
  return [...results].sort((a, b) => {
    const score = (r) =>
      (r.phone && r.phone !== 'N/A' ? 3 : 0) +
      (r.isLocal ? 2 : 0) +
      (r.hasWebsite ? 1 : 0) +
      Math.min(r.rating || 0, 2) +
      (r.dataQuality || 0) * 0.5;
    return score(b) - score(a);
  });
}

function calcConfidence(count) {
  if (count >= 8) return 'high';
  if (count >= 3) return 'medium';
  return 'low';
}

function avgDataQuality(results) {
  if (!results.length) return 0;
  const total = results.reduce((sum, r) => {
    let score = 0;
    if (r.phone && r.phone !== 'N/A') score += 3;
    if (r.isLocal) score += 2;
    if (r.hasWebsite) score += 1;
    if (r.rating) score += Math.min(r.rating, 2);
    return sum + score;
  }, 0);
  return total / results.length;
}

async function runSingleSearch(apiKey, query, location) {
  const params = { q: query, api_key: apiKey, engine: 'google', num: 10, hl: 'en' };
  if (location) params.location = location;
  const resp = await searchWithRetry(params);
  return [
    ...mapLocalResults(resp.data.local_results?.places, location),
    ...mapOrganicResults(resp.data.organic_results)
  ];
}

// ─── Fix #1: Build query variations using niche, synonyms, and intentModifiers ─
function buildQueries(niche, synonyms, intentModifiers, location) {
  const terms = [niche, ...synonyms].filter(Boolean).slice(0, 2); // niche + 1 synonym
  const queries = terms.map(t => `${t} in ${location}`);

  // Add modifier-enhanced queries (e.g. "cheap pg accommodation in noida")
  if (intentModifiers && intentModifiers.length > 0) {
    const mod = intentModifiers[0];
    terms.forEach(t => queries.push(`${mod} ${t} in ${location}`));
  }

  // Cap at 4 total — balance coverage vs API cost
  return [...new Set(queries)].slice(0, 4);
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * @param {string} niche
 * @param {string} location
 * @param {boolean} requiresNoWebsite
 * @param {string[]} synonyms
 * @param {string[]} locationChain
 * @param {string[]} intentModifiers - Fix #1: e.g. ["cheap", "budget"]
 * @returns {{ results, usedLocation, originalLocation, confidence, type, nextFallback }}
 */
async function searchWeb(niche, location, requiresNoWebsite = false, synonyms = [], locationChain = [], intentModifiers = []) {
  const apiKey = process.env.SERPAPI_KEY;

  // Fix #9: Cache check
  const key = cacheKey(niche, location, intentModifiers);
  const cached = getCache(key);
  if (cached) {
    console.log(`[SEARCH] Cache hit for "${key}"`);
    return cached;
  }

  console.log(`[SEARCH] niche="${niche}" | location="${location}" | modifiers=[${intentModifiers.join(', ')}] | synonyms=[${synonyms.join(', ')}] | key=${apiKey ? 'OK' : 'MISSING'}`);

  if (!apiKey) {
    console.warn('[SEARCH] SerpAPI key missing — returning simulation data');
    return {
      results: [
        { title: `${niche} in ${location}`, link: 'https://example.com/1', snippet: `Top ${niche}.`, isLocal: false, phone: 'N/A', hasWebsite: true, rating: 0 },
        { title: `Best ${niche} near ${location}`, link: 'https://example.com/2', snippet: 'Highly rated.', isLocal: false, phone: 'N/A', hasWebsite: true, rating: 0 }
      ],
      usedLocation: location, originalLocation: location, confidence: 'low', type: 'NO_RESULTS', nextFallback: null
    };
  }

  try {
    const seen = new Set();
    let combined = [];

    const addUnique = (items) => {
      for (const item of items) {
        if (item.title && !seen.has(item.title)) { seen.add(item.title); combined.push(item); }
      }
    };

    // ── Phase 1: Multi-term parallel search (Fix #1 modifier queries) ──────────
    const queries = buildQueries(niche, synonyms, intentModifiers, location);
    console.log(`[SEARCH] Phase 1: ${queries.length} parallel queries at "${location}":`, queries);

    const phase1 = await Promise.allSettled(queries.map(q => runSingleSearch(apiKey, q, location)));
    phase1.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        console.log(`[SEARCH]   "${queries[i]}" → ${r.value.length} results`);
        addUnique(r.value);
      } else {
        console.log(`[SEARCH]   "${queries[i]}" failed: ${r.reason?.message}`);
      }
    });
    console.log(`[SEARCH] After Phase 1: ${combined.length} unique results`);

    // ── Fix #3: Early stop — only if quantity AND quality are sufficient ─────────
    if (combined.length >= 10 && avgDataQuality(combined) >= 5) {
      console.log(`[SEARCH] Early stop — ${combined.length} results, avg quality ${avgDataQuality(combined).toFixed(1)}`);
      const result = { results: rankResults(combined), usedLocation: location, originalLocation: location, confidence: calcConfidence(combined.length), type: 'SUCCESS', nextFallback: null };
      setCache(key, result);
      return result;
    }

    // ── Phase 2: Google Maps engine if local coverage is thin ────────────────
    const localCount = combined.filter(r => r.isLocal).length;
    if (requiresNoWebsite || localCount < 5) {
      try {
        console.log('[SEARCH] Phase 2: Google Maps engine...');
        const mapsResp = await searchWithRetry({ q: `${niche} in ${location}`, api_key: apiKey, engine: 'google_maps', type: 'search' });
        const mapsItems = mapMapsResults(mapsResp.data.local_results, location);
        console.log(`[SEARCH] Phase 2 got ${mapsItems.length} Maps results`);
        addUnique(mapsItems);
      } catch (mapsErr) {
        console.log(`[SEARCH] Phase 2 Maps failed: ${mapsErr.message}`);
      }
    }

    if (requiresNoWebsite) {
      combined = combined.filter(r => !r.hasWebsite);
      console.log(`[SEARCH] After no-website filter: ${combined.length} results`);
    }

    // ── Fix #3: Early stop after Phase 2 — same quality gate ────────────────
    if (combined.length >= 10 && avgDataQuality(combined) >= 5) {
      console.log(`[SEARCH] Early stop after Phase 2 — ${combined.length} results, avg quality ${avgDataQuality(combined).toFixed(1)}`);
      const result = { results: rankResults(combined), usedLocation: location, originalLocation: location, confidence: calcConfidence(combined.length), type: 'SUCCESS', nextFallback: null };
      setCache(key, result);
      return result;
    }

    // ── Phase 3: Location fallback chain ─────────────────────────────────────
    let usedLocation = location;
    const chain = locationChain.length > 1 ? locationChain : [];
    const nextFallback = chain[1] || null; // Fix #7/#8: expose next level for auto-suggest

    if (combined.length === 0 && chain.length > 1) {
      for (let i = 1; i < chain.length; i++) {
        const fallbackLoc = chain[i];
        console.log(`[SEARCH] Phase 3: Fallback to "${fallbackLoc}"...`);
        const fallbackQueries = buildQueries(niche, synonyms.slice(0, 1), intentModifiers, fallbackLoc);
        const fallback = await Promise.allSettled(fallbackQueries.slice(0, 2).map(q => runSingleSearch(apiKey, q, fallbackLoc)));
        fallback.forEach(r => { if (r.status === 'fulfilled') addUnique(r.value); });
        if (combined.length > 0) {
          usedLocation = fallbackLoc;
          console.log(`[SEARCH] Found ${combined.length} results at fallback "${fallbackLoc}"`);
          break;
        }
      }
    }

    const ranked = rankResults(combined);
    const confidence = calcConfidence(ranked.length);

    // Fix #7: Return structured type
    const type = ranked.length === 0 ? 'NO_RESULTS' : 'SUCCESS';
    console.log(`[SEARCH] Final: ${ranked.length} results | type=${type} | location="${usedLocation}" | confidence=${confidence}`);

    const result = { results: ranked, usedLocation, originalLocation: location, confidence, type, nextFallback: ranked.length === 0 ? nextFallback : null };
    if (ranked.length > 0) setCache(key, result); // only cache successful results
    return result;

  } catch (error) {
    // Fix #7: Detect failure type from HTTP status
    const status = error.response?.status;
    const failureType = (['ECONNABORTED','ETIMEDOUT','ENOTFOUND','ECONNRESET'].includes(error.code)) ? 'TIMEOUT'
                      : status === 429 ? 'RATE_LIMITED'
                      : status === 403 ? 'BLOCKED'
                      : 'API_ERROR';
    console.error(`[SEARCH] ${failureType}:`, error.response?.data || error.message);
    throw Object.assign(new Error(`Web search failed: ${error.message}`), { failureType });
  }
}

module.exports = { searchWeb };
