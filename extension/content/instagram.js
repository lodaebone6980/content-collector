/**
 * Instagram Content Script
 * 저장 + 컬렉션 폴더 + 백엔드 전송
 */
(function() {
  function init() {
    // Instagram SPA URL 변경 감지
    const observer = new MutationObserver(() => {
      const path = window.location.pathname;
      if (path.startsWith('/p/') || path.startsWith('/reel/')) {
        setTimeout(injectCollectButton, 1500);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const path = window.location.pathname;
    if (path.startsWith('/p/') || path.startsWith('/reel/')) {
      setTimeout(injectCollectButton, 2000);
    }
  }

  function injectCollectButton() {
    if (document.getElementById('cc-ig-collect-btn')) return;

    // 게시물 액션 바 (좋아요, 댓글, 공유, 저장)
    const actionSection = document.querySelector('section.x78zum5, article section');
    if (!actionSection) return;

    const btn = document.createElement('button');
    btn.id = 'cc-ig-collect-btn';
    btn.innerHTML = '📥';
    btn.title = 'Content Collector로 수집';
    btn.style.cssText = `
      background: none; border: none; font-size: 24px; cursor: pointer;
      padding: 8px; margin-left: 8px; transition: transform 0.2s;
    `;

    btn.addEventListener('mouseover', () => { btn.style.transform = 'scale(1.2)'; });
    btn.addEventListener('mouseout', () => { btn.style.transform = 'scale(1)'; });
    btn.addEventListener('click', () => handleCollect(btn));

    actionSection.appendChild(btn);
  }

  async function handleCollect(btn) {
    const url = window.location.href;
    btn.innerHTML = '⏳';
    btn.style.pointerEvents = 'none';

    try {
      const settings = await chrome.storage.sync.get('platformSettings');
      const igSettings = settings.platformSettings?.instagram || { autoSave: true };

      // Instagram 저장 버튼 클릭
      if (igSettings.autoSave) {
        const saveBtn = document.querySelector('svg[aria-label*="저장"], svg[aria-label*="Save"]');
        if (saveBtn) {
          const saveButton = saveBtn.closest('button') || saveBtn.parentElement;
          if (saveButton) saveButton.click();
        }
      }

      // 백엔드에 수집 요청
      const response = await chrome.runtime.sendMessage({
        action: 'collect',
        url: url,
        tags: [],
      });

      if (response.success) {
        btn.innerHTML = '✅';
        setTimeout(() => {
          btn.innerHTML = '📥';
          btn.style.pointerEvents = 'auto';
        }, 3000);
      } else {
        throw new Error(response.error);
      }
    } catch (err) {
      btn.innerHTML = '❌';
      console.error('Content Collector 오류:', err);
      setTimeout(() => {
        btn.innerHTML = '📥';
        btn.style.pointerEvents = 'auto';
      }, 3000);
    }
  }

  init();
})();
