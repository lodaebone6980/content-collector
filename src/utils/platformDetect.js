/**
 * URL에서 플랫폼과 콘텐츠 타입을 감지합니다.
 * @returns {{ platform: string, type: string, id: string|null }}
 */
function detectPlatform(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');

    // YouTube Shorts (반드시 일반 YouTube 체크보다 먼저)
    if (host === 'youtube.com' && u.pathname.startsWith('/shorts/')) {
      const id = u.pathname.split('/shorts/')[1].replace(/\/$/, '');
      return { platform: 'youtube', type: 'shorts', id };
    }

    // YouTube
    if (host === 'youtube.com' || host === 'youtu.be') {
      let videoId = null;
      if (host === 'youtu.be') {
        videoId = u.pathname.slice(1);
      } else {
        videoId = u.searchParams.get('v');
      }
      return { platform: 'youtube', type: 'video', id: videoId };
    }

    // Threads
    if (host === 'threads.net' || host === 'threads.com') {
      const postMatch = u.pathname.match(/@([^/]+)\/post\/([^/]+)/);
      return {
        platform: 'threads',
        type: 'post',
        id: postMatch ? postMatch[2] : null,
        username: postMatch ? postMatch[1] : null,
      };
    }

    // Instagram Reels
    if (host === 'instagram.com' && u.pathname.startsWith('/reel/')) {
      const id = u.pathname.split('/reel/')[1].replace(/\/$/, '');
      return { platform: 'instagram', type: 'reel', id };
    }

    // Instagram 카드뉴스 (일반 포스트)
    if (host === 'instagram.com' && u.pathname.startsWith('/p/')) {
      const id = u.pathname.split('/p/')[1].replace(/\/$/, '');
      return { platform: 'instagram', type: 'post', id };
    }

    return { platform: 'unknown', type: 'unknown', id: null };
  } catch {
    return { platform: 'unknown', type: 'unknown', id: null };
  }
}

module.exports = { detectPlatform };
