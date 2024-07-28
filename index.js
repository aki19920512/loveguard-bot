const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');
const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');

const app = express();
const port = process.env.PORT || 3000;

const secretClient = new SecretManagerServiceClient();

// シークレットを取得する関数
async function getSecret(secretName) {
  const [version] = await secretClient.accessSecretVersion({
    name: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/secrets/${secretName}/versions/latest`,
  });
  return version.payload.data.toString('utf8');
}

let config;
let client;

// レートリミット設定（1分に1回のリクエスト）
const RATE_LIMIT = 60000;
let lastRequestTime = 0;

async function initializeApp() {
  const LINE_CHANNEL_ACCESS_TOKEN = await getSecret('LINE_CHANNEL_ACCESS_TOKEN');
  const LINE_CHANNEL_SECRET = await getSecret('LINE_CHANNEL_SECRET');
  
  config = {
    channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: LINE_CHANNEL_SECRET
  };

  client = new line.Client(config);

  app.post('/webhook', line.middleware(config), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
      .then(result => res.json(result))
      .catch(err => {
        console.error('Webhook Error:', err);
        res.status(500).end();
      });
  });

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  console.log(`Received message: ${event.message.text}`);

  let responseMessage = '';

  const currentTime = new Date().getTime();

  if (currentTime - lastRequestTime < RATE_LIMIT) {
    responseMessage = 'リクエストが多すぎます。しばらくしてから再度お試しください。';
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: responseMessage
    });
  }

  try {
    const OPENAI_API_KEY = await getSecret('OPENAI_API_KEY');
    const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{ role: 'user', content: event.message.text }],
      max_tokens: 50,
      temperature: 0.5
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      timeout: 10000
    });

    responseMessage = openaiResponse.data.choices[0].message.content.trim();
    console.log('OpenAI Response:', openaiResponse.data);

    lastRequestTime = currentTime;
  } catch (error) {
    // エラーハンドリングは変更なし
    responseMessage = 'Sorry, I could not process your message.';
  }
  console.log('Replying with message:', responseMessage);

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: responseMessage
  });
}

initializeApp().catch(console.error);