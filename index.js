const express = require('express');
const line = require('@line/bot-sdk');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000; // 環境変数PORTを使用し、デフォルトは3000

// LINE Bot SDK設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(config);

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(result => res.json(result))
    .catch(err => {
      console.error(err);
      res.status(500).end();
    });
});

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  console.log(`Received message: ${event.message.text}`);

  let responseMessage = '';

  try {
    // OpenAI Assistants APIを使用して応答を生成
    const apiKey = process.env.OPENAI_API_KEY;
    const assistantId = process.env.OPENAI_ASSISTANT_ID;
    const openAiApiUrl = `https://api.openai.com/v1/assistants/${assistantId}/query`;

    const openAiResponse = await axios.post(openAiApiUrl, {
      query: event.message.text,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    responseMessage = openAiResponse.data.response; // APIのレスポンスに応じて適切に取得
  } catch (error) {
    console.error('Error with OpenAI API:', error);
    responseMessage = 'Sorry, I could not process your message.';
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: responseMessage
  });
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
