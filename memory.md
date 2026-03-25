# Memory — Content Collector

> 이 파일은 프로젝트 진행 중 내린 결정, 시도한 것, 남은 것을 기록합니다.
> Claude와 작업할 때 이 파일을 먼저 읽어서 컨텍스트를 이어받습니다.

---

## 프로젝트 현황

**상태**: 구조 완성, 환경변수 설정 및 배포 단계

**마지막 작업**: 전체 프로젝트 파일 생성 완료 (2025-03-25)

---

## 확정된 결정사항

### 인프라
- **호스팅**: Railway 또는 Render 무료 플랜 (Node.js 서버)
- **시간대**: 서버는 UTC, KST 오프셋 +9 수동 계산으로 cron 처리
- **스케줄**: 하루 4회 — 09:00 / 14:00 / 19:00 / 23:00 KST

### AI 모델
- **분석 모델**: `claude-haiku-4-5-20251001` — 속도/비용 최적화
- **프롬프트 출력 형식**: JSON 고정 (summary, keyPoints, tags, topic, ownerCommentSummary)

### Notion 구조
- **최상위 DB**: 날짜별 페이지 목록
- **날짜 페이지 속성**: Name(제목), Date(날짜), Topics(주제 누적 텍스트)
- **콘텐츠 블록**: callout → bullet(핵심포인트) → quote(작성자댓글) → paragraph(태그/메타)
- **플랫폼 구분**: 날짜 페이지 내 heading_2로 YouTube / Threads / Instagram 섹션 분리

### 수집 방법 표시
- 자동 수집 (스케줄): `source = 'schedule'` → Notion에 "자동" 표시 + 🕐 아이콘
- 수동 수집 (봇): `source = 'telegram' | 'discord'` → "수동" 표시 + 📌 아이콘

### 댓글 필터링 전략
- YouTube: `channelId` 비교로 채널 소유자 댓글만 추출 (API 필요)
- Threads / Instagram: 공식 API 없음 → 현재 빈 배열, 추후 Puppeteer 확장 예정

---

## 미완성 / TODO

### 우선순위 높음
- [ ] Notion DB 자동 셋업 스크립트 (`scripts/setup-notion.js`)
- [ ] 텔레그램 `/today` 명령어 — 오늘 수집 건수 Notion에서 조회
- [ ] 중복 URL 체크 — 같은 링크 재수집 방지 (Notion 조회 or 로컬 Set)

### 우선순위 중간
- [ ] Puppeteer 기반 Instagram 공개 피드 자동 수집
- [ ] Puppeteer 기반 Threads 공개 계정 자동 수집
- [ ] YouTube 구독 채널 목록을 Notion DB에서 관리 (환경변수 대신)

### 우선순위 낮음
- [ ] Chrome 확장프로그램 — 브라우저에서 직접 봇으로 전송
- [ ] 주간 요약 리포트 (매주 월요일 자동 생성)
- [ ] 태그 기반 검색 명령어 (`/search #AI`)

---

## 시도했지만 포기한 것

| 시도 | 이유 |
|---|---|
| Instagram Graph API 사용 | 개인 계정 접근 불가, 비즈니스 계정만 지원 |
| Threads oEmbed 전체 본문 추출 | og:description만 제공, 전체 텍스트 불가 |

---

## 환경변수 현황

| 변수 | 상태 | 메모 |
|---|---|---|
| NOTION_TOKEN | ⬜ 미설정 | — |
| NOTION_ROOT_DB_ID | ⬜ 미설정 | — |
| ANTHROPIC_API_KEY | ⬜ 미설정 | — |
| TELEGRAM_BOT_TOKEN | ⬜ 미설정 | — |
| TELEGRAM_ALLOWED_CHAT_ID | ⬜ 미설정 | — |
| DISCORD_BOT_TOKEN | ⬜ 미설정 | — |
| DISCORD_ALLOWED_CHANNEL_ID | ⬜ 미설정 | — |
| YOUTUBE_API_KEY | ⬜ 미설정 | — |
| YOUTUBE_CHANNELS | ⬜ 미설정 | 채널 ID 콤마 구분 |

> 설정 완료 시 ⬜ → ✅ 로 업데이트

---

## 구독 목록 현황

```
YouTube 채널:
  (없음 — .env의 YOUTUBE_CHANNELS에 추가)

Threads 계정:
  @jaykimuniverse  (초기 테스트 계정)

Instagram 계정:
  (없음)
```

---

## 다음 세션에서 이어받는 방법

1. 이 파일 (memory.md) 읽기
2. CLAUDE.md 읽기
3. 현재 TODO 목록에서 우선순위 높은 것부터 시작
4. 새로운 결정은 "확정된 결정사항" 섹션에 추가
5. 완료된 TODO는 ~~취소선~~ 처리 후 완료일 기입
