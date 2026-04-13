const axios = require('axios');

/**
 * Search the web for leads using SerpAPI
 * @param {string} niche - The business niche
 * @param {string} location - The location
 * @param {boolean} requiresNoWebsite - If true, strictly filter out businesses with websites
 * @returns {Promise<Array>} - List of search results
 */
async function searchWeb(niche, location, requiresNoWebsite = false) {
  const query = location ? `${niche} in ${location}` : niche;
  const apiKey = process.env.SERPAPI_KEY;

  console.log(`[SEARCH] Query: "${query}" | Location: "${location}" | NoWebsite: ${requiresNoWebsite} | Key: ${apiKey ? 'Present' : 'MISSING'}`);

  if (!apiKey) {
    console.warn('[SEARCH] SerpAPI key not found, using simulation.');
    return [
      { title: `${niche} Experts in ${location}`, link: 'https://example.com/1', snippet: `Best ${niche} in ${location}.`, isLocal: false },
      { title: `${location} ${niche} Pros`, link: 'https://example.com/2', snippet: 'Top rated professionals.', isLocal: false }
    ];
  }

  try {
    // --- ATTEMPT 1: Standard Google search (gets both local + organic) ---
    const params = {
      q: query,
      api_key: apiKey,
      engine: 'google',
      num: 15,
      hl: 'en'
    };
    if (location) params.location = location;

    console.log('[SEARCH] Phase 1: Standard Google search...');
    const response = await axios.get('https://serpapi.com/search', { params });
    
    const localResults = response.data.local_results?.places || [];
    const organicResults = response.data.organic_results || [];
    
    console.log(`[SEARCH] Phase 1 got ${localResults.length} local + ${organicResults.length} organic`);

    const mappedLocal = localResults.map(r => ({
      title: r.title,
      link: r.links?.website || `https://www.google.com/search?q=${encodeURIComponent(r.title + ' ' + location)}`,
      snippet: `${r.type || ''} | ${r.address || ''} | Rating: ${r.rating || 'N/A'}`,
      phone: r.phone || 'N/A',
      address: r.address || '',
      isLocal: true,
      hasWebsite: !!r.links?.website
    }));

    const mappedOrganic = organicResults.map(result => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet || '',
      phone: 'N/A',
      address: '',
      isLocal: false,
      hasWebsite: true
    }));

    // --- ATTEMPT 2: If no-website is requested OR we got few local results, try Google Maps engine ---
    let mappedMaps = [];
    if (requiresNoWebsite || localResults.length < 5) {
      try {
        console.log('[SEARCH] Phase 2: Google Maps engine for richer local data...');
        const mapsParams = {
          q: query,
          api_key: apiKey,
          engine: 'google_maps',
          ll: '',
          type: 'search'
        };
        const mapsResponse = await axios.get('https://serpapi.com/search', { params: mapsParams });
        const mapsResults = mapsResponse.data.local_results || [];
        console.log(`[SEARCH] Phase 2 got ${mapsResults.length} Google Maps results`);

        mappedMaps = mapsResults.map(r => ({
          title: r.title,
          link: r.website || `https://www.google.com/search?q=${encodeURIComponent(r.title + ' ' + location)}`,
          snippet: `${r.type || ''} | ${r.address || ''} | Rating: ${r.rating || 'N/A'} | Reviews: ${r.reviews || 0}`,
          phone: r.phone || 'N/A',
          address: r.address || '',
          isLocal: true,
          hasWebsite: !!r.website
        }));
      } catch (mapsErr) {
        console.log(`[SEARCH] Maps fallback failed: ${mapsErr.message}`);
      }
    }

    // --- BUILD FINAL RESULT SET ---
    let combined = [];

    if (requiresNoWebsite) {
      console.log('[SEARCH] Enforcing strict NO WEBSITE filter...');
      // Merge all local sources and filter out those WITH websites
      const allLocal = [...mappedLocal, ...mappedMaps];
      // Deduplicate by title
      const seen = new Set();
      const uniqueLocal = allLocal.filter(l => {
        if (seen.has(l.title)) return false;
        seen.add(l.title);
        return true;
      });
      combined = uniqueLocal.filter(c => !c.hasWebsite);
      console.log(`[SEARCH] After strict filter: ${combined.length} businesses WITHOUT websites`);
    } else {
      // Normal mode: Combine everything, deduped, local first
      const allResults = [...mappedLocal, ...mappedMaps, ...mappedOrganic];
      const seen = new Set();
      combined = allResults.filter(l => {
        if (seen.has(l.title)) return false;
        seen.add(l.title);
        return true;
      });
    }
    
    console.log(`[SEARCH] Returning ${combined.length} total results`);
    return combined;
  } catch (error) {
    console.error('[SEARCH] API Error:', error.response?.data || error.message);
    throw new Error(`Web search failed: ${error.message}`);
  }
}

module.exports = { searchWeb };
