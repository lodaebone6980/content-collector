# Skill: 새 플랫폼 스크래퍼 추가

## 언제 사용하나
새로운 SNS 플랫폼(예: TikTok, X/Twitter, Naver Blog 등)의 수집 기능을 추가할 때.

---

## 체크리스트

### 1. platformDetect.js에 URL 패턴 등록
```js
// src/utils/platformDetect.js
// detectPlatform() 함수의 if-else 체인에 추가

if (host === '새플랫폼.com') {
  const id = /* URL에서 ID 추출 */;
  return { platform: '새플랫폼', type: 'post', id };
}
```

### 2. 스크래퍼 파일 생성
`src/scrapers/새플랫폼.js` 를 만들고 아래 구조를 따를 것:

```js
/**
 * 반드시 반환해야 하는 필드:
 * - title: string          (없으면 작성자명 + 플랫폼)
 * - author: string
 * - [text|caption|transcript]: string  (AI 분석에 사용할 본문)
 * - ownerComments: string[]  (작성자 본인 댓글/답글)
 * - publishedAt: ISO string
 * - contentType: string
 */
async function scrape새플랫폼(url, detected) {
  // 1. 공식 API 시도
  // 2. oEmbed fallback
  // 3. HTML 파싱 fallback
  // 모든 단계에서 try/catch — 절대 throw 금지, 빈 값으로 진행
}

async function getLatestPosts(username, maxResults = 5) {
  // 스케줄 수집용 — 불가능하면 [] 반환 + console.warn
}

module.exports = { scrape새플랫폼, getLatestPosts };
```

### 3. processUrl.js switch 문에 케이스 추가
```js
case '새플랫폼':
  raw = await scrape새플랫폼(url, detected);
  break;
```

require도 상단에 추가:
```js
const { scrape새플랫폼 } = require('../scrapers/새플랫폼');
```

### 4. runCollectionCycle()에 루프 추가 (스케줄 수집용)
```js
// processUrl.js 하단 runCollectionCycle 함수
for (const username of watchlist.새플랫폼) {
  const { getLatestPosts } = require('../scrapers/새플랫폼');
  const posts = await getLatestPosts(username);
  for (const postUrl of posts) {
    await processUrl(postUrl, 'schedule');
    stats.새플랫폼++;
    stats.total++;
  }
}
```

### 5. 환경변수 추가 (API 키 필요 시)
```bash
# .env.example에 추가
새플랫폼_API_KEY=xxxxxxxxxxxx
새플랫폼_ACCOUNTS=계정1,계정2
```

### 6. scheduler/cron.js의 WATCHLIST에 추가
```js
const WATCHLIST = {
  youtube: ...,
  threads: ...,
  instagram: ...,
  새플랫폼: (process.env.새플랫폼_ACCOUNTS || '').split(',').filter(Boolean),
};
```

### 7. notion/client.js 색상 맵 추가
```js
function platformColor(platform) {
  const map = {
    youtube: 'red_background',
    threads: 'purple_background',
    instagram: 'orange_background',
    새플랫폼: 'blue_background',  // 추가
  };
}
```

### 8. README.md 업데이트
- 지원 플랫폼 목록
- 새 환경변수 설명

### 9. memory.md 업데이트
- 구독 목록 현황에 추가
- 제약사항 있으면 "시도했지만 포기한 것" 또는 TODO에 기록

---

## 주의사항
- `scrape*` 함수에서 절대 throw하지 말 것 — 빈 값 반환 후 파이프라인 계속
- HTML 파싱은 사이트 구조 변경으로 언제든 깨질 수 있음 — try/catch 필수
- 로그인이 필요한 콘텐츠는 수집하지 않음 (공개 콘텐츠만)
