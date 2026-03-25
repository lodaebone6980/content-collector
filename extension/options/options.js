document.addEventListener('DOMContentLoaded', async () => {
  // 저장된 설정 로드
  const data = await chrome.storage.sync.get(['backendUrl', 'apiKey', 'platformSettings']);

  document.getElementById('backendUrl').value = data.backendUrl || '';
  document.getElementById('apiKey').value = data.apiKey || '';

  const ps = data.platformSettings || {};
  const yt = ps.youtube || { autoLike: true, autoSave: true, playlistName: 'Content Collector' };
  const ig = ps.instagram || { autoSave: true, collectionName: 'Content Collector' };
  const th = ps.threads || { autoSave: true };

  document.getElementById('yt-autoLike').checked = yt.autoLike !== false;
  document.getElementById('yt-autoSave').checked = yt.autoSave !== false;
  document.getElementById('yt-playlist').value = yt.playlistName || 'Content Collector';
  document.getElementById('ig-autoSave').checked = ig.autoSave !== false;
  document.getElementById('ig-collection').value = ig.collectionName || 'Content Collector';
  document.getElementById('th-autoSave').checked = th.autoSave !== false;

  // 저장
  document.getElementById('save-btn').addEventListener('click', async () => {
    await chrome.storage.sync.set({
      backendUrl: document.getElementById('backendUrl').value.replace(/\/$/, ''),
      apiKey: document.getElementById('apiKey').value,
      platformSettings: {
        youtube: {
          autoLike: document.getElementById('yt-autoLike').checked,
          autoSave: document.getElementById('yt-autoSave').checked,
          playlistName: document.getElementById('yt-playlist').value,
        },
        instagram: {
          autoSave: document.getElementById('ig-autoSave').checked,
          collectionName: document.getElementById('ig-collection').value,
        },
        threads: {
          autoSave: document.getElementById('th-autoSave').checked,
        },
      },
    });

    const toast = document.getElementById('toast');
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2000);
  });
});
