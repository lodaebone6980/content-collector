/**
 * 백엔드 서버와 통신하는 헬퍼
 */
async function getSettings() {
  const data = await chrome.storage.sync.get(['backendUrl', 'apiKey']);
  return {
    backendUrl: data.backendUrl || '',
    apiKey: data.apiKey || '',
  };
}

async function collectUrl(url, tags = []) {
  const { backendUrl, apiKey } = await getSettings();
  if (!backendUrl) throw new Error('백엔드 URL이 설정되지 않았습니다. 확장프로그램 설정을 확인하세요.');

  const res = await fetch(`${backendUrl}/api/collect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url, tags }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || '수집 요청 실패');
  }

  return res.json();
}

async function getServerStatus() {
  const { backendUrl, apiKey } = await getSettings();
  if (!backendUrl) return null;

  const res = await fetch(`${backendUrl}/api/status`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  return res.ok ? res.json() : null;
}

async function getTodayStats() {
  const { backendUrl, apiKey } = await getSettings();
  if (!backendUrl) return null;

  const res = await fetch(`${backendUrl}/api/today`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
  return res.ok ? res.json() : null;
}
