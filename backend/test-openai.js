require('dotenv').config();
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testConnection() {
  console.log('Testing OpenAI connection...');
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say 'Success! Connection verified.' if you can hear me." }],
      max_tokens: 15,
    });

    console.log('\nAI Response:', response.choices[0].message.content);
    console.log('\n✅ Your API key is working perfectly!');
  } catch (error) {
    console.error('\n❌ OpenAI Error:', error.message);
    if (error.status === 401) {
      console.error('Hint: The API key is invalid or has expired.');
    } else if (error.status === 429) {
      console.error('Hint: You have hit your rate limit or ran out of credits.');
    } else {
      console.error('Status Code:', error.status);
    }
  }
}

testConnection();
