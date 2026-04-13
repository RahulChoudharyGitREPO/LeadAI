const axios = require('axios');

async function test() {
  console.log('Testing discovery pipeline...\n');
  
  try {
    const res = await axios.post('http://localhost:5000/api/chat', {
      messages: [
        { role: 'user', content: 'Find coaching centers in Kolkata' }
      ]
    }, { timeout: 60000 });

    console.log('=== AI Response ===');
    console.log(res.data.message);
    console.log('\n=== Tool Data ===');
    if (res.data.data) {
      res.data.data.forEach(d => {
        const parsed = JSON.parse(d.content);
        console.log(`Tool: ${d.name} | Results: ${parsed.length}`);
        parsed.forEach(l => console.log(`  - ${l.name} | ${l.location || 'N/A'} | ${l.phone || 'N/A'}`));
      });
    }
  } catch (err) {
    console.error('TEST FAILED:', err.response?.data || err.message);
  }
}

test();
