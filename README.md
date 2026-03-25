# Content Collector

YouTube · Threads · Instagram 콘텐츠를 자동 수집해서 Notion에 날짜별로 정리하는 시스템.

## 동작 방식

### Mode A — 스케줄 자동 수집
매일 KST 기준 **09:00 · 14:00 · 19:00 · 23:00** 에 자동 실행.
구독 목록의 계정/채널에서 새 콘텐츠를 수집 → AI 분석 → Notion 저장 → 완료 알림.

### Mode B — 봇 수동 수집
텔레그램 또는 디스코드에 링크를 보내면 즉시 처리.
`#태그 https://링크` 형식으로 보내면 태그까지 함께 저장.

---

## 1. 설치

```bash
git clone <repo-url>
cd content-collector
npm install
cp .env.example .env
# .env 파일을 편집해서 환경변수 입력
```

## 2. 환경변수 설정 (.env)

| 변수 | 필수 | 설명 |
|---|---|---|
| `NOTION_TOKEN` | ✅ | Notion 통합 토큰 (내부 통합에서 발급) |
| `NOTION_ROOT_DB_ID` | ✅ | 최상위 날짜 DB ID |
| `ANTHROPIC_API_KEY` | ✅ | Claude AI 분석용 |
| `TELEGRAM_BOT_TOKEN` | 선택 | 텔레그램 봇 토큰 |
| `TELEGRAM_ALLOWED_CHAT_ID` | 선택 | 허용할 채팅 ID (보안) |
| `DISCORD_BOT_TOKEN` | 선택 | 디스코드 봇 토큰 |
| `DISCORD_ALLOWED_CHANNEL_ID` | 선택 | 허용할 채널 ID |
| `DISCORD_WEBHOOK_URL` | 선택 | 알림 전용 웹훅 (봇 없이도 사용 가능) |
| `YOUTUBE_API_KEY` | 선택 | 채널 자막/댓글 수집 강화 |
| `YOUTUBE_CHANNELS` | 선택 | 채널 ID 콤마 구분 (`UCxxx,UCyyy`) |

## 3. Notion DB 설정

Root DB에 아래 속성을 만들어주세요:

| 속성명 | 타입 |
|---|---|
| Name | 제목 |
| Date | 날짜 |
| Topics | 텍스트 |

## 4. 로컬 실행

```bash
npm run dev
```

## 5. Railway 배포

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 배포
railway login
railway init
railway up

# 환경변수 설정 (Railway 대시보드 또는 CLI)
railway variables set NOTION_TOKEN=secret_xxx
railway variables set ANTHROPIC_API_KEY=sk-ant-xxx
# ... 나머지 변수들
```

## 6. Render 배포

1. [render.com](https://render.com) 에서 New → Web Service
2. GitHub 레포 연결
3. Build Command: `npm install`
4. Start Command: `node src/index.js`
5. Environment Variables에 `.env.example` 내용 입력

## 7. 텔레그램 봇 명령어

| 명령어 | 설명 |
|---|---|
| `/start` | 사용법 안내 |
| `/status` | 서버 상태 확인 |
| `/today` | 오늘 수집 현황 |
| `링크` 전송 | 즉시 수집 |
| `#태그 링크` | 태그와 함께 수집 |

## 8. 프로젝트 구조

```
src/
├── index.js              # 메인 진입점
├── scheduler/
│   └── cron.js           # KST 스케줄 관리
├── bots/
│   ├── telegram.js       # 텔레그램 봇
│   └── discord.js        # 디스코드 봇
├── scrapers/
│   ├── youtube.js        # YouTube 수집
│   ├── threads.js        # Threads 수집
│   └── instagram.js      # Instagram 수집
├── analyzer/
│   └── ai.js             # Claude AI 분석
├── notion/
│   └── client.js         # Notion 저장
└── utils/
    ├── platformDetect.js # URL → 플랫폼 감지
    ├── processUrl.js     # 수집 오케스트레이터
    └── notify.js         # 알림 발송
```

## 주의사항

- Instagram / Threads 자동 계정 수집은 공식 API 미제공으로 **링크 수동 전송** 방식 권장
- YouTube 채널 자동 수집은 `YOUTUBE_API_KEY` + `YOUTUBE_CHANNELS` 설정 필요
- Railway/Render 무료 플랜은 비활성 상태에서 슬립될 수 있음 — `/health` 엔드포인트로 keepalive 설정 권장
