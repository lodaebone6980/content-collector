/**
 * Chrome Storage 래퍼
 */
async function getRecentCollections() {
  const data = await chrome.storage.local.get('recentCollections');
  return data.recentCollections || [];
}

async function addRecentCollection(item) {
  const recent = await getRecentCollections();
  recent.unshift({
    ...item,
    timestamp: new Date().toISOString(),
  });
  // 최근 20개만 유지
  await chrome.storage.local.set({
    recentCollections: recent.slice(0, 20),
  });
}

async function getTodayCount() {
  const recent = await getRecentCollections();
  const today = new Date().toISOString().slice(0, 10);
  return recent.filter(r => r.timestamp?.startsWith(today)).length;
}

async function getPlatformSettings() {
  const data = await chrome.storage.sync.get('platformSettings');
  return data.platformSettings || {
    youtube: { autoLike: true, autoSave: true, playlistName: 'Content Collector' },
    instagram: { autoSave: true, collectionName: 'Content Collector' },
    threads: { autoSave: true },
  };
}
