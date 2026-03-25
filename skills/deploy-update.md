# Skill: Railway/Render 배포 및 업데이트

## 최초 배포

### Railway
```bash
# 1. CLI 설치
npm install -g @railway/cli

# 2. 로그인 및 프로젝트 초기화
railway login
cd content-collector
railway init          # 새 프로젝트 생성
railway up            # 첫 배포

# 3. 환경변수 일괄 설정 (.env 파일 기반)
railway variables set $(cat .env | grep -v '^#' | grep '=' | xargs)

# 4. 도메인 확인
railway domain
```

### Render
1. [render.com](https://render.com) → New → Web Service
2. GitHub 레포 연결 (또는 수동 업로드)
3. Build Command: `npm install`
4. Start Command: `node src/index.js`
5. Health Check Path: `/health`
6. Environment → 환경변수 입력
7. Deploy

---

## 코드 업데이트 배포

### Railway (GitHub 연동 시 자동)
```bash
git add .
git commit -m "feat: 기능 추가 내용"
git push origin main
# → Railway가 자동으로 재배포
```

### Railway (수동)
```bash
railway up
```

### Render
- GitHub 연동 시: push하면 자동 재배포
- 수동: Render 대시보드 → Manual Deploy

---

## 환경변수 추가/수정

```bash
# Railway CLI
railway variables set NEW_VAR=value

# 여러 개 한번에
railway variables set VAR1=a VAR2=b VAR3=c
```

> ⚠️ 환경변수 변경 후 자동 재시작 됨 — 수집 중이면 잠깐 중단될 수 있음

---

## 무료 플랜 슬립 방지

Railway/Render 무료 플랜은 일정 시간 요청이 없으면 슬립 상태가 됨.
스케줄러가 깨우기 전에 슬립이 걸리면 수집 누락 발생.

**해결책 1: 외부 핑 서비스 (무료)**
- [UptimeRobot](https://uptimerobot.com) → New Monitor → HTTP(s)
- URL: `https://<내 서버>/health`
- 간격: 5분
- → 서버를 계속 깨어있게 유지

**해결책 2: 자체 핑 (코드 내 추가)**
```js
// src/index.js에 추가
if (process.env.SELF_PING_URL) {
  setInterval(() => {
    require('axios').get(process.env.SELF_PING_URL + '/health').catch(() => {});
  }, 4 * 60 * 1000); // 4분마다
}
```

---

## 배포 후 확인 체크리스트

```bash
# 1. 헬스체크
curl https://<배포URL>/health

# 2. 단건 테스트
curl -X POST https://<배포URL>/trigger \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# 3. Notion에서 오늘 날짜 페이지 생성됐는지 확인

# 4. 텔레그램 봇에 링크 보내서 응답 확인
```

---

## 롤백

```bash
# Railway — 이전 배포로 롤백
railway deployments  # 배포 목록 확인
railway rollback <deployment-id>
```

Render는 대시보드 → Deploys → 이전 버전 → Re-deploy
