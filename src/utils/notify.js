/**
 * 스케줄 완료 알림을 텔레그램/디스코드 양쪽으로 발송
 */
async function sendNotification(message) {
  const promises = [];

  // 텔레그램
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ALLOWED_CHAT_ID) {
    promises.push(sendTelegramMessage(message));
  }

  // 디스코드
  if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_ALLOWED_CHANNEL_ID) {
    promises.push(sendDiscordMessage(message));
  }

  await Promise.allSettled(promises);
}

async function sendTelegramMessage(text) {
  const axios = require('axios');
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  });
}

async function sendDiscordMessage(text) {
  // Discord webhook 방식 (봇 없이도 동작)
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl) {
    const axios = require('axios');
    await axios.post(webhookUrl, { content: text });
  }
}

module.exports = { sendNotification };
