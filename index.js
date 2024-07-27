const express = require('express');
const line = require('@line/bot-sdk');

const app = express();

// LINE Bot SDK設定
const config = {
  channelAccessToken: 'L5fre3gDyK5qFppljPrgdyCUWjP99ItsmV/V1beXNHsJEkefJ8DK24Xbsxkw2Cxk6AjvXKRXG2tuhWWqjxXSgz8vfFp6m8ocakmtvFEeOpXUsVztI2rlolGD5ARLd1Il6sA00yYZxXtqE8PB7Ify5wdB04t89/1O/w1cDnyilFU=',
  channelSecret: '61f424ef0dbb8bf68e3f85929521ff12'
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

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  console.log(`Received message: ${event.message.text}`);

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `Received your message: ${event.message.text}`
  });
}

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
