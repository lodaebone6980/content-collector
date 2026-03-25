# Skill: 수집 오류 디버깅

## 언제 사용하나
수집이 안 되거나, Notion에 저장이 안 되거나, 봇이 응답하지 않을 때.

---

## 증상별 빠른 진단

### 봇이 응답하지 않음
```bash
# 1. 서버 헬스체크
curl http://localhost:3000/health

# 2. 텔레그램 봇 토큰 확인
curl https://api.telegram.org/bot<TOKEN>/getMe

# 3. 허용된 chat_id 확인 — 봇에게 메시지 보낸 후:
curl https://api.telegram.org/bot<TOKEN>/getUpdates
# → result[0].message.chat.id 값이 TELEGRAM_ALLOWED_CHAT_ID와 일치해야 함
```

### 수집은 되는데 Notion에 저장 안 됨
```bash
# Notion 토큰 유효성
curl -H "Authorization: Bearer $NOTION_TOKEN" \
     -H "Notion-Version: 2022-06-28" \
     https://api.notion.com/v1/users/me

# DB 접근 권한 확인
curl -H "Authorization: Bearer $NOTION_TOKEN" \
     -H "Notion-Version: 2022-06-28" \
     https://api.notion.com/v1/databases/$NOTION_ROOT_DB_ID
# → 403이면 DB에 통합 연결 안 된 것 (Notion 대시보드에서 "연결 추가" 필요)
```

### YouTube 자막이 없음
- 영상에 자막이 없으면 description으로 fallback (정상 동작)
- 한국어 자막 먼저 시도, 없으면 전체 언어 시도
- 자동 생성 자막도 수집됨

### Threads/Instagram 내용이 비어 있음
- og:description이 짧거나 없는 경우 정상
- 로그인 필요 계정이면 공개 콘텐츠 없음 → 빈 값 반환
- `text: ''`, `caption: ''`이어도 AI 분석은 title 기준으로 진행됨

---

## 로그 읽는 법

```
🔍 [youtube/video] https://...    ← 플랫폼 감지 성공
⚠️  자막 없음 (abc123), 설명 사용  ← 정상 fallback
⚠️  AI 분석 오류: ...              ← AI 실패, fallback값으로 저장 계속
❌ 수집 오류 (14:00): ...          ← 전체 사이클 오류, 알림 발송됨
```

---

## 단계별 격리 테스트

```js
// 각 단계를 개별적으로 테스트

// 1. 플랫폼 감지
const { detectPlatform } = require('./src/utils/platformDetect');
console.log(detectPlatform('https://www.youtube.com/watch?v=abc123'));

// 2. 스크래핑만
const { scrapeYouTube } = require('./src/scrapers/youtube');
scrapeYouTube('https://...', { id: 'abc123', type: 'video' }).then(console.log);

// 3. AI 분석만
const { analyzeContent } = require('./src/analyzer/ai');
analyzeContent({ title: '테스트', transcript: '내용...' }).then(console.log);

// 4. Notion 저장만
const { saveToNotion } = require('./src/notion/client');
saveToNotion({ title: '테스트', summary: '요약', tags: [], ... }).then(console.log);
```

---

## Railway/Render 배포 환경 디버깅

```bash
# Railway 로그 실시간 확인
railway logs --tail

# 환경변수 확인
railway variables

# 강제 재배포
railway up --detach
```

```bash
# Render는 대시보드 → Logs 탭에서 확인
# 환경변수 누락 시 서버 시작 시 아래 오류:
# Error: NOTION_TOKEN is not defined
```

---

## 자주 발생하는 오류 메시지

| 메시지 | 원인 | 해결 |
|---|---|---|
| `403 Unauthorized` | Notion DB에 통합 미연결 | Notion 대시보드 → DB → 연결 추가 |
| `400 Bad Request (Notion)` | 속성명 불일치 | DB 속성명과 코드의 property key 일치 확인 |
| `429 Too Many Requests` | YouTube API 할당량 초과 | API 쿼터 확인, 수집 간격 늘리기 |
| `ETELEGRAM: 409 Conflict` | 봇 polling 중복 실행 | 서버 인스턴스 하나만 실행 중인지 확인 |
| `Cannot find module` | npm install 안 됨 | `npm install` 재실행 |
