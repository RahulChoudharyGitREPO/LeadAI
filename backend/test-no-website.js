const axios = require('axios');

async function testFilter() {
  console.log('Testing discover_leads_on_web with strict explicit no-website parameters...\n');
  try {
    const res = await axios.post('http://localhost:5000/api/chat', {
      messages: [
        { role: 'user', content: 'Find coaching centers in Dhanbad without websites.' }
      ]
    }, { timeout: 60000 });

    console.log('=== AI Response ===');
    console.log(res.data.message);
    console.log('\n=== Tool Data ===');
    if (res.data.data) {
      res.data.data.forEach(d => {
        const parsed = JSON.parse(d.content);
        console.log(`Tool: ${d.name} | Results: ${parsed.length}`);
        parsed.forEach(l => console.log(`  - Name: ${l.name} | Phone: ${l.phone || 'N/A'} | Source Link: ${l.url}`));
      });
    }
  } catch (err) {
    console.error('TEST FAILED:', err.response?.data || err.message);
  }
}

testFilter();
