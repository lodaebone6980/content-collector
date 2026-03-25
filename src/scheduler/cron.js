const cron = require('node-cron');
const { runCollectionCycle } = require('../utils/processUrl');
const { sendNotification } = require('../utils/notify');

// KST = UTC+9
// node-cron은 서버 로컬 시간 기준이므로 UTC 서버(Railway/Render)에서는 -9시간
const KST_SCHEDULES = {
  '09:00': '0 0 * * *',   // UTC 00:00 = KST 09:00
  '14:00': '0 5 * * *',   // UTC 05:00 = KST 14:00
  '19:00': '0 10 * * *',  // UTC 10:00 = KST 19:00
  '23:00': '0 14 * * *',  // UTC 14:00 = KST 23:00
};

// 구독 목록 (환경변수 또는 Notion DB에서 로드 가능)
const WATCHLIST = {
  youtube: (process.env.YOUTUBE_CHANNELS || '').split(',').filter(Boolean),
  threads: (process.env.THREADS_ACCOUNTS || '').split(',').filter(Boolean),
  instagram: (process.env.INSTAGRAM_ACCOUNTS || '').split(',').filter(Boolean),
};

function initScheduler() {
  const scheduleStr = process.env.SCHEDULE_TIMES || '09:00,14:00,19:00,23:00';
  const times = scheduleStr.split(',').map(t => t.trim());

  times.forEach(time => {
    const cronExpr = KST_SCHEDULES[time];
    if (!cronExpr) {
      console.warn(`⚠️  알 수 없는 시간: ${time}`);
      return;
    }

    cron.schedule(cronExpr, async () => {
      const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
      console.log(`\n⏰ [스케줄] ${kstNow.toISOString().slice(0, 16)} KST 수집 시작`);

      try {
        const stats = await runCollectionCycle(WATCHLIST);
        const msg = `✅ ${time} 수집 완료\n`
          + `YouTube: ${stats.youtube}건\n`
          + `Threads: ${stats.threads}건\n`
          + `Instagram: ${stats.instagram}건\n`
          + `총 ${stats.total}건 저장됨`;

        await sendNotification(msg);
        console.log(msg);
      } catch (err) {
        const errMsg = `❌ 수집 오류 (${time}): ${err.message}`;
        await sendNotification(errMsg);
        console.error(errMsg);
      }
    }, {
      timezone: 'UTC'
    });

    console.log(`  📅 ${time} KST 스케줄 등록 (cron: ${cronExpr})`);
  });
}

module.exports = { initScheduler };
