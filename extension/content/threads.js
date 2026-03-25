/**
 * Threads Content Script
 * 저장/북마크 + 백엔드 전송
 */
(function() {
  function init() {
    const observer = new MutationObserver(() => {
      if (window.location.pathname.includes('/post/')) {
        setTimeout(injectCollectButton, 1500);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    if (window.location.pathname.includes('/post/')) {
      setTimeout(injectCollectButton, 2000);
    }
  }

  function injectCollectButton() {
    if (document.getElementById('cc-threads-collect-btn')) return;

    // Threads 게시글 액션 영역
    const actionArea = document.querySelector('[data-pressable-container]');
    if (!actionArea) return;

    const btn = document.createElement('button');
    btn.id = 'cc-threads-collect-btn';
    btn.innerHTML = '📥 수집';
    btn.style.cssText = `
      background: #7B1FA2; color: white; border: none; border-radius: 16px;
      padding: 6px 14px; font-size: 13px; cursor: pointer;
      font-weight: 600; transition: all 0.2s; margin-top: 8px;
    `;

    btn.addEventListener('mouseover', () => { btn.style.background = '#6A1B9A'; });
    btn.addEventListener('mouseout', () => { btn.style.background = '#7B1FA2'; });
    btn.addEventListener('click', () => handleCollect(btn));

    actionArea.parentElement.appendChild(btn);
  }

  async function handleCollect(btn) {
    const url = window.location.href;
    btn.innerHTML = '⏳ 수집 중...';
    btn.disabled = true;

    try {
      // 백엔드에 수집 요청
      const response = await chrome.runtime.sendMessage({
        action: 'collect',
        url: url,
        tags: [],
      });

      if (response.success) {
        btn.innerHTML = '✅ 완료!';
        btn.style.background = '#4CAF50';
        setTimeout(() => {
          btn.innerHTML = '📥 수집';
          btn.style.background = '#7B1FA2';
          btn.disabled = false;
        }, 3000);
      } else {
        throw new Error(response.error);
      }
    } catch (err) {
      btn.innerHTML = '❌ 실패';
      btn.style.background = '#F44336';
      console.error('Content Collector 오류:', err);
      setTimeout(() => {
        btn.innerHTML = '📥 수집';
        btn.style.background = '#7B1FA2';
        btn.disabled = false;
      }, 3000);
    }
  }

  init();
})();
