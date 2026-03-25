/**
 * YouTube Content Script
 * 좋아요 + 재생목록 저장 + 백엔드 전송
 */
(function() {
  let collectBtn = null;

  function init() {
    // URL 변경 감지 (YouTube SPA)
    const observer = new MutationObserver(() => {
      if (window.location.pathname === '/watch' || window.location.pathname.startsWith('/shorts/')) {
        injectCollectButton();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 초기 로드
    if (window.location.pathname === '/watch' || window.location.pathname.startsWith('/shorts/')) {
      setTimeout(injectCollectButton, 2000);
    }
  }

  function injectCollectButton() {
    if (document.getElementById('cc-collect-btn')) return;

    // 좋아요/싫어요 버튼 영역 찾기
    const actionBar = document.querySelector('#top-level-buttons-computed, ytd-menu-renderer');
    if (!actionBar) return;

    collectBtn = document.createElement('button');
    collectBtn.id = 'cc-collect-btn';
    collectBtn.innerHTML = '📥 수집';
    collectBtn.style.cssText = `
      background: #2196F3; color: white; border: none; border-radius: 20px;
      padding: 8px 16px; font-size: 14px; cursor: pointer; margin-left: 8px;
      font-weight: 600; transition: all 0.2s;
    `;

    collectBtn.addEventListener('mouseover', () => {
      collectBtn.style.background = '#1976D2';
    });
    collectBtn.addEventListener('mouseout', () => {
      collectBtn.style.background = '#2196F3';
    });

    collectBtn.addEventListener('click', handleCollect);
    actionBar.appendChild(collectBtn);
  }

  async function handleCollect() {
    const url = window.location.href;
    collectBtn.innerHTML = '⏳ 수집 중...';
    collectBtn.disabled = true;

    try {
      // 플랫폼 설정 확인
      const settings = await chrome.storage.sync.get('platformSettings');
      const ytSettings = settings.platformSettings?.youtube || { autoLike: true, autoSave: true };

      // 좋아요 클릭
      if (ytSettings.autoLike) {
        const likeBtn = document.querySelector('like-button-view-model button, #segmented-like-button button');
        if (likeBtn && !likeBtn.getAttribute('aria-pressed')?.includes('true')) {
          likeBtn.click();
        }
      }

      // 저장 버튼 클릭 (재생목록에 추가)
      if (ytSettings.autoSave) {
        const saveBtn = document.querySelector('button[aria-label*="저장"], button[aria-label*="Save"]');
        if (saveBtn) saveBtn.click();
      }

      // 백엔드에 수집 요청
      const response = await chrome.runtime.sendMessage({
        action: 'collect',
        url: url,
        tags: [],
      });

      if (response.success) {
        collectBtn.innerHTML = '✅ 완료!';
        collectBtn.style.background = '#4CAF50';
        setTimeout(() => {
          collectBtn.innerHTML = '📥 수집';
          collectBtn.style.background = '#2196F3';
          collectBtn.disabled = false;
        }, 3000);
      } else {
        throw new Error(response.error);
      }
    } catch (err) {
      collectBtn.innerHTML = '❌ 실패';
      collectBtn.style.background = '#F44336';
      console.error('Content Collector 오류:', err);
      setTimeout(() => {
        collectBtn.innerHTML = '📥 수집';
        collectBtn.style.background = '#2196F3';
        collectBtn.disabled = false;
      }, 3000);
    }
  }

  init();
})();
