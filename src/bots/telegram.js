const TelegramBot = require('node-telegram-bot-api');
const { processUrl } = require('../utils/processUrl');
const { getTodayStats } = require('../notion/client');

let bot;

function initTelegramBot(app) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookUrl = process.env.RAILWAY_PUBLIC_DOMAIN
    || process.env.WEBHOOK_URL
    || '';

  if (webhookUrl) {
    // 배포 환경: Webhook 방식 (polling 충돌 방지)
    bot = new TelegramBot(token);
    const fullUrl = webhookUrl.startsWith('http') ? webhookUrl : `https://${webhookUrl}`;
    bot.setWebHook(`${fullUrl}/bot${token}`);

    // Express 라우트로 webhook 수신
    app.post(`/bot${token}`, (req, res) => {
      bot.processUpdate(req.body);
      res.sendStatus(200);
    });

    console.log(`  Telegram webhook 설정: ${fullUrl}/bot***`);
  } else {
    // 로컬 개발: Polling 방식
    bot = new TelegramBot(token, { polling: true });
    console.log('  Telegram polling 모드');
  }

  const allowedId = String(process.env.TELEGRAM_ALLOWED_CHAT_ID);

  // 메시지 처리
  bot.on('message', async (msg) => {
    const chatId = String(msg.chat.id);

    if (allowedId && chatId !== allowedId) {
      return bot.sendMessage(chatId, '⛔ 인증되지 않은 사용자입니다.');
    }

    const text = msg.text || '';

    if (text === '/start') {
      return bot.sendMessage(chatId,
        '📥 Content Collector Bot\n\n'
        + '사용법:\n'
        + '• 링크만 전송 → 자동 수집\n'
        + '• `#태그 링크` → 태그와 함께 저장\n\n'
        + '명령어:\n'
        + '/status — 서버 상태 확인\n'
        + '/today — 오늘 수집 현황'
      );
    }

    if (text === '/status') {
      const uptime = Math.floor(process.uptime() / 60);
      return bot.sendMessage(chatId, `✅ 서버 정상 동작 중\n⏱ 업타임: ${uptime}분`);
    }

    if (text === '/today') {
      try {
        const stats = await getTodayStats();
        return bot.sendMessage(chatId,
          `📊 오늘 수집 현황 (${stats.date})\n\n`
          + `▶ YouTube: ${stats.youtube}건\n`
          + `◎ Threads: ${stats.threads}건\n`
          + `◈ Instagram: ${stats.instagram}건\n`
          + `━━━━━━━━━━\n`
          + `📦 총 ${stats.total}건`
        );
      } catch (err) {
        return bot.sendMessage(chatId, `❌ 조회 오류: ${err.message}`);
      }
    }

    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) {
      return bot.sendMessage(chatId, '🔗 URL을 찾을 수 없습니다.\nYouTube, Threads, Instagram 링크를 보내주세요.');
    }

    const url = urlMatch[0];
    const tagMatch = text.match(/#([^\s#]+)/g);
    const extraTags = tagMatch ? tagMatch.map(t => t.slice(1)) : [];

    await bot.sendMessage(chatId, '⏳ 수집 중입니다...');

    try {
      const result = await processUrl(url, 'telegram', extraTags);
      const reply = `✅ 저장 완료!\n\n`
        + `📌 ${result.title}\n`
        + `🏷 ${result.tags.join(' · ')}\n`
        + `📝 ${result.summary.slice(0, 100)}...\n\n`
        + `🔗 [Notion에서 보기](${result.notionUrl})`;
      await bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
    } catch (err) {
      await bot.sendMessage(chatId, `❌ 오류 발생: ${err.message}`);
    }
  });

  return bot;
}

function getTelegramBot() {
  return bot;
}

module.exports = { initTelegramBot, getTelegramBot };
