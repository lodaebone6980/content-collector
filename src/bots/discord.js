const { Client, GatewayIntentBits, Events } = require('discord.js');
const { processUrl } = require('../utils/processUrl');

let client;

function initDiscordBot() {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, (c) => {
    console.log(`  Discord: ${c.user.tag} 로그인 완료`);
  });

  client.on(Events.MessageCreate, async (message) => {
    // 봇 메시지 무시
    if (message.author.bot) return;

    // 허용된 채널만 처리
    const allowedChannel = process.env.DISCORD_ALLOWED_CHANNEL_ID;
    if (allowedChannel && message.channelId !== allowedChannel) return;

    const text = message.content;

    // 명령어
    if (text === '!status') {
      const uptime = Math.floor(process.uptime() / 60);
      return message.reply(`✅ 서버 정상 동작 중 | 업타임: ${uptime}분`);
    }

    // URL 추출
    const urlMatch = text.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) return;

    const url = urlMatch[0];
    const tagMatch = text.match(/#([^\s#]+)/g);
    const extraTags = tagMatch ? tagMatch.map(t => t.slice(1)) : [];

    const processing = await message.reply('⏳ 수집 중...');

    try {
      const result = await processUrl(url, 'discord', extraTags);
      await processing.edit(
        `✅ **저장 완료!**\n`
        + `📌 ${result.title}\n`
        + `🏷 ${result.tags.join(' · ')}\n`
        + `📝 ${result.summary.slice(0, 120)}...\n`
        + `🔗 ${result.notionUrl}`
      );
    } catch (err) {
      await processing.edit(`❌ 오류: ${err.message}`);
    }
  });

  client.login(process.env.DISCORD_BOT_TOKEN);
  return client;
}

module.exports = { initDiscordBot };
