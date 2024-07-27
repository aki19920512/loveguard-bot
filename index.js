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
      console.error('Webhook Error:', err);
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
    // OpenAI APIを使用して応答を生成
    const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{ role: 'user', content: event.message.text }],
      max_tokens: 50,
      temperature: 0.5
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    });

    responseMessage = openaiResponse.data.choices[0].message.content.trim();
  } catch (error) {
    if (error.response) {
      // サーバーがエラー応答を返した場合
      console.error('OpenAI API Response Error:', error.response.data);
    } else if (error.request) {
      // リクエストが送信されたが応答がない場合
      console.error('OpenAI API No Response:', error.request);
    } else {
      // リクエストを設定中にエラーが発生した場合
      console.error('OpenAI API Request Error:', error.message);
    }
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
