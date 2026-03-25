require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initScheduler } = require('./scheduler/cron');
const { initTelegramBot } = require('./bots/telegram');
const { initDiscordBot } = require('./bots/discord');
const { apiKeyAuth } = require('./middleware/auth');
const { getTodayStats } = require('./notion/client');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── 헬스체크 ─────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ─── 수동 트리거 (테스트용) ───────────────────────
app.post('/trigger', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url 필드가 필요합니다' });
  const { processUrl } = require('./utils/processUrl');
  try {
    const result = await processUrl(url, 'manual-api');
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 확장프로그램 API ──────────────────────────
app.post('/api/collect', apiKeyAuth, async (req, res) => {
  const { url, tags } = req.body;
  if (!url) return res.status(400).json({ error: 'url 필드가 필요합니다' });
  const { processUrl } = require('./utils/processUrl');
  try {
    const extraTags = Array.isArray(tags) ? tags : [];
    const result = await processUrl(url, 'extension', extraTags);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/status', apiKeyAuth, (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime() / 60),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/today', apiKeyAuth, async (req, res) => {
  try {
    const stats = await getTodayStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 서버 시작 ─────────────────────────────────
async function main() {
  console.log('🚀 Content Collector 시작 중...');

  // 스케줄러 초기화 (Mode A)
  initScheduler();
  console.log('✅ 스케줄러 초기화 완료 (KST 기준 4회/일)');

  // 텔레그램 봇 초기화 (Mode B)
  if (process.env.TELEGRAM_BOT_TOKEN) {
    initTelegramBot();
    console.log('✅ 텔레그램 봇 연결 완료');
  }

  // 디스코드 봇 초기화 (Mode B)
  if (process.env.DISCORD_BOT_TOKEN) {
    initDiscordBot();
    console.log('✅ 디스코드 봇 연결 완료');
  }

  app.listen(PORT, () => {
    console.log(`✅ HTTP 서버 포트 ${PORT} 에서 실행 중`);
  });
}

main().catch(console.error);
