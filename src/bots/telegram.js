const TelegramBot = require('node-telegram-bot-api');
const { processUrl } = require('../utils/processUrl');
const { getTodayStats } = require('../notion/client');

let bot;

function initTelegramBot() {
  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  const allowedId = String(process.env.TELEGRAM_ALLOWED_CHAT_ID);

  // 링크 수신 처리
  bot.on('message', async (msg) => {
    const chatId = String(msg.chat.id);

    // 허용된 계정만 처리
    if (allowedId && chatId !== allowedId) {
      return bot.sendMessage(chatId, '⛔ 인증되지 않은 사용자입니다.');
    }

    const text = msg.text || '';

    // 명령어 처리
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

    // URL 추출
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) {
      return bot.sendMessage(chatId, '🔗 URL을 찾을 수 없습니다.\nYouTube, Threads, Instagram 링크를 보내주세요.');
    }

    const url = urlMatch[0];

    // #태그 추출 (URL 앞에 붙은 태그)
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
