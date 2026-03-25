/**
 * Service Worker — 확장프로그램 백그라운드 로직
 * Content script에서 메시지를 받아 백엔드로 전달
 */

importScripts('utils/api.js', 'utils/storage.js');

// Content script에서의 메시지 처리
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'collect') {
    handleCollect(message, sender.tab)
      .then(sendResponse)
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // 비동기 응답
  }

  if (message.action === 'getStatus') {
    getServerStatus()
      .then(status => sendResponse({ success: true, status }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.action === 'getTodayStats') {
    getTodayStats()
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleCollect(message, tab) {
  const { url, tags } = message;

  try {
    // 백엔드에 수집 요청
    const result = await collectUrl(url, tags || []);

    // 수집 기록 저장
    await addRecentCollection({
      url,
      title: result.result?.title || url,
      platform: detectPlatform(url),
    });

    // 배지 업데이트
    const count = await getTodayCount();
    chrome.action.setBadgeText({ text: String(count) });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });

    return { success: true, result: result.result };
  } catch (err) {
    // 오류 배지
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#F44336' });
    throw err;
  }
}

function detectPlatform(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('threads.net')) return 'threads';
  if (url.includes('instagram.com')) return 'instagram';
  return 'unknown';
}

// 매일 배지 리셋
chrome.alarms.create('resetBadge', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'resetBadge') {
    const count = await getTodayCount();
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  }
});
