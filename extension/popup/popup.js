document.addEventListener('DOMContentLoaded', async () => {
  const collectBtn = document.getElementById('collect-btn');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const platformEl = document.getElementById('platform');
  const pageUrlEl = document.getElementById('page-url');
  const tagsInput = document.getElementById('tags');
  const settingsLink = document.getElementById('settings-link');

  // 현재 탭 정보
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  const platform = detectPlatformFromUrl(url);

  platformEl.textContent = platform !== 'unknown' ? platform.toUpperCase() : '지원되지 않는 페이지';
  pageUrlEl.textContent = url.length > 50 ? url.slice(0, 50) + '...' : url;

  if (platform !== 'unknown') {
    collectBtn.disabled = false;
  }

  // 서버 상태 확인
  try {
    const status = await getServerStatus();
    if (status) {
      statusDot.className = 'dot on';
      statusText.textContent = `서버 연결됨 (${status.uptime}분)`;
    } else {
      statusDot.className = 'dot off';
      statusText.textContent = '서버 연결 실패';
    }
  } catch {
    statusDot.className = 'dot off';
    statusText.textContent = '설정을 확인하세요';
  }

  // 오늘 통계
  try {
    const data = await getTodayStats();
    if (data?.stats) {
      document.getElementById('yt-count').textContent = data.stats.youtube;
      document.getElementById('th-count').textContent = data.stats.threads;
      document.getElementById('ig-count').textContent = data.stats.instagram;
    }
  } catch {
    // 통계 로드 실패 무시
  }

  // 수집 버튼
  collectBtn.addEventListener('click', async () => {
    collectBtn.disabled = true;
    collectBtn.textContent = '⏳ 수집 중...';

    const tagStr = tagsInput.value.trim();
    const tags = tagStr ? tagStr.match(/#([^\s#]+)/g)?.map(t => t.slice(1)) || [] : [];

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'collect',
        url: url,
        tags: tags,
      });

      if (response.success) {
        collectBtn.textContent = '✅ 저장 완료!';
        collectBtn.className = 'collect-btn success';
      } else {
        throw new Error(response.error);
      }
    } catch (err) {
      collectBtn.textContent = '❌ ' + (err.message || '실패');
      collectBtn.className = 'collect-btn error';
    }

    setTimeout(() => {
      collectBtn.textContent = '📥 수집하기';
      collectBtn.className = 'collect-btn';
      collectBtn.disabled = false;
    }, 3000);
  });

  // 설정 페이지
  settingsLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});

function detectPlatformFromUrl(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('threads.net')) return 'threads';
  if (url.includes('instagram.com')) return 'instagram';
  return 'unknown';
}
