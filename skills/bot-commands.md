# Skill: 봇 명령어 추가

## 언제 사용하나
텔레그램이나 디스코드 봇에 새로운 명령어를 추가할 때.

---

## 텔레그램 명령어 추가 패턴

`src/bots/telegram.js`의 `bot.on('message', ...)` 핸들러 안에 추가:

```js
if (text === '/새명령어') {
  // 처리 로직
  return bot.sendMessage(chatId, '응답 메시지');
}
```

### 예시: `/today` — 오늘 수집 현황

```js
if (text === '/today') {
  const { Client } = require('@notionhq/client');
  const notion = new Client({ auth: process.env.NOTION_TOKEN });

  const today = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);

  const res = await notion.databases.query({
    database_id: process.env.NOTION_ROOT_DB_ID,
    filter: { property: 'Date', date: { equals: today } },
  });

  if (!res.results.length) {
    return bot.sendMessage(chatId, '오늘 아직 수집된 콘텐츠가 없습니다.');
  }

  const page = res.results[0];
  const topics = page.properties?.Topics?.rich_text?.[0]?.text?.content || '없음';
  const pageUrl = `https://notion.so/${page.id.replace(/-/g, '')}`;

  return bot.sendMessage(chatId,
    `📅 오늘 (${today}) 수집 현황\n\n`
    + `주제: ${topics}\n`
    + `🔗 ${pageUrl}`,
    { parse_mode: 'Markdown' }
  );
}
```

### 예시: `/add` — 구독 계정 추가

```js
if (text.startsWith('/add ')) {
  const url = text.replace('/add ', '').trim();
  const { detectPlatform } = require('../utils/platformDetect');
  const detected = detectPlatform(url);

  if (detected.platform === 'unknown') {
    return bot.sendMessage(chatId, '❌ 인식할 수 없는 URL입니다.');
  }

  // TODO: .env의 WATCHLIST에 추가하거나 별도 JSON 파일에 저장
  return bot.sendMessage(chatId, `✅ @${detected.username || detected.id} 추가됨 (${detected.platform})`);
}
```

---

## 디스코드 명령어 추가 패턴

`src/bots/discord.js`의 `client.on(Events.MessageCreate, ...)` 핸들러 안에 추가:

```js
if (text === '!새명령어') {
  return message.reply('응답');
}
```

---

## 명령어 목록 자동 업데이트

텔레그램에서 `/start` 응답 메시지도 함께 업데이트:

```js
if (text === '/start') {
  return bot.sendMessage(chatId,
    '📥 Content Collector Bot\n\n'
    + '명령어:\n'
    + '/status — 서버 상태\n'
    + '/today  — 오늘 수집 현황\n'   // ← 새 명령어 추가 시 여기도
    + '/add <URL> — 구독 추가\n'
    + '\n링크를 보내면 즉시 수집합니다.'
  );
}
```

---

## 주의사항
- 모든 명령어 핸들러에 try/catch 추가할 것
- Notion API 호출이 포함된 명령어는 응답 전에 "조회 중..." 메시지 먼저 보낼 것
- chatId 유효성 검사(`allowedId`) 통과 후 처리
