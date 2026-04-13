const axios = require('axios');

const API = 'http://localhost:5000/api/chat';

const TESTS = [
  // --- BASIC CITY SEARCHES ---
  { name: '1. Restaurants in Mumbai', query: 'Find restaurants in Mumbai' },
  { name: '2. Gyms in Delhi', query: 'Find gyms in Delhi' },
  { name: '3. Plumbers in Ranchi', query: 'Find plumbers in Ranchi' },
  
  // --- NO WEBSITE FILTER ---
  { name: '4. No-website: Tutors in Patna', query: 'Find tutoring centers in Patna that do not have a website' },
  
  // --- INTERNATIONAL ---
  { name: '5. Bakeries in London', query: 'Find bakeries in London' },
  
  // --- NICHE QUERIES ---
  { name: '6. Wedding photographers in Jaipur', query: 'Find wedding photographers in Jaipur' },
  
  // --- INTERNAL DB QUERY ---
  { name: '7. Show existing leads', query: 'Show me all my saved leads' },
  
  // --- AMBIGUOUS "NEAR ME" ---
  { name: '8. Near me (should ask city)', query: 'Find electricians near me' },
];

async function runTest(test) {
  const start = Date.now();
  console.log(`\n${'='.repeat(70)}`);
  console.log(`TEST: ${test.name}`);
  console.log(`QUERY: "${test.query}"`);
  console.log('='.repeat(70));

  try {
    const res = await axios.post(API, {
      messages: [{ role: 'user', content: test.query }]
    }, { timeout: 120000 });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const msg = res.data.message;
    const toolData = res.data.data;

    // Analyze results
    let totalLeads = 0;
    let newLeads = 0;
    let dupeLeads = 0;
    let withPhone = 0;
    let withLocation = 0;
    let withWebsite = 0;
    let leads = [];

    if (toolData) {
      toolData.forEach(d => {
        const parsed = JSON.parse(d.content);
        if (Array.isArray(parsed)) {
          leads = [...leads, ...parsed];
          totalLeads += parsed.length;
          parsed.forEach(l => {
            if (l.isDuplicate) dupeLeads++;
            else newLeads++;
            if (l.phone && l.phone !== 'N/A') withPhone++;
            if (l.location && l.location !== 'N/A') withLocation++;
            if (l.url && !l.url.includes('google.com/search')) withWebsite++;
          });
        }
      });
    }

    // Print summary
    console.log(`\n📊 RESULTS:`);
    console.log(`  ⏱️  Time: ${elapsed}s`);
    console.log(`  📋 Total Leads: ${totalLeads}`);
    console.log(`  🆕 New: ${newLeads} | ♻️ Duplicates: ${dupeLeads}`);
    console.log(`  📞 With Phone: ${withPhone}/${totalLeads} (${totalLeads ? Math.round(withPhone/totalLeads*100) : 0}%)`);
    console.log(`  📍 With Location: ${withLocation}/${totalLeads} (${totalLeads ? Math.round(withLocation/totalLeads*100) : 0}%)`);
    console.log(`  🌐 With Real Website: ${withWebsite}/${totalLeads}`);
    
    // Print AI response (truncated)
    console.log(`\n💬 AI Response: "${msg.substring(0, 150)}${msg.length > 150 ? '...' : ''}"`);

    // Print first 3 leads as sample
    if (leads.length > 0) {
      console.log(`\n📇 Sample Leads (first 3):`);
      leads.slice(0, 3).forEach((l, i) => {
        console.log(`  ${i+1}. ${l.name || 'UNNAMED'} | 📞 ${l.phone || 'N/A'} | 📍 ${l.location || 'N/A'}`);
      });
    }

    // QUALITY FLAGS
    const issues = [];
    if (totalLeads === 0 && !test.query.includes('saved') && !test.query.includes('near me')) issues.push('❌ ZERO LEADS RETURNED');
    if (totalLeads > 0 && withPhone === 0) issues.push('⚠️ NO PHONE NUMBERS FOUND');
    if (totalLeads > 0 && withLocation === 0) issues.push('⚠️ NO LOCATIONS FOUND');
    if (elapsed > 30) issues.push('⚠️ SLOW (>30s)');
    if (msg.length > 500) issues.push('⚠️ AI TEXT TOO VERBOSE');

    if (issues.length > 0) {
      console.log(`\n🚩 ISSUES:`);
      issues.forEach(i => console.log(`  ${i}`));
    } else {
      console.log(`\n✅ PASSED`);
    }

    return { name: test.name, status: issues.length === 0 ? 'PASS' : 'WARN', leads: totalLeads, time: elapsed, issues };
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n❌ FAILED after ${elapsed}s: ${err.response?.data?.error || err.message}`);
    return { name: test.name, status: 'FAIL', leads: 0, time: elapsed, issues: [err.message] };
  }
}

async function main() {
  console.log('🔬 AI LEAD DISCOVERY - PRODUCTION READINESS TEST SUITE');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`🎯 Running ${TESTS.length} tests...\n`);

  const results = [];
  for (const test of TESTS) {
    const result = await runTest(test);
    results.push(result);
  }

  // Final Report
  console.log(`\n\n${'═'.repeat(70)}`);
  console.log('📊 FINAL REPORT');
  console.log('═'.repeat(70));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`\n  ✅ Passed: ${passed}/${TESTS.length}`);
  console.log(`  ⚠️ Warnings: ${warned}/${TESTS.length}`);
  console.log(`  ❌ Failed: ${failed}/${TESTS.length}`);
  
  console.log(`\n  Breakdown:`);
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️' : '❌';
    console.log(`    ${icon} ${r.name} — ${r.leads} leads in ${r.time}s ${r.issues?.length ? '(' + r.issues.join(', ') + ')' : ''}`);
  });

  console.log(`\n${'═'.repeat(70)}`);
}

main();
