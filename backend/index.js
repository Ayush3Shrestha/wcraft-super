import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:20128/v1',
  apiKey: 'sk-1dcc60a6200fd7da-614c84-8e9d6f4a', // Leave as a dummy string
});

async function run() {
  try {
    const response = await openai.chat.completions.create({
      // Switch to a free tier model mapped in your gateway
      model: 'ds/deepseek-v4-flash', 
      messages: [
        { role: 'user', content: 'Hello! Are we using a free provider?' }
      ],
    });

    console.log('Response:', response.choices.message.content);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

run();

