const axios = require('axios');

const YT_API_KEY = process.env.YOUTUBE_API_KEY;

/**
 * YouTube 영상 단건 스크래핑
 */
async function scrapeYouTube(url, detected) {
  const videoId = detected.id;
  if (!videoId) throw new Error('YouTube 영상 ID를 찾을 수 없습니다.');

  // 기본 메타데이터
  const meta = await getVideoMeta(videoId);

  // 자막/트랜스크립트
  let transcript = '';
  try {
    const { YoutubeTranscript } = await import('youtube-transcript');
    const segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'ko' })
      .catch(() => YoutubeTranscript.fetchTranscript(videoId));
    transcript = segments.map(s => s.text).join(' ').slice(0, 8000);
  } catch {
    console.log(`    자막 없음 (${videoId}), 설명 사용`);
    transcript = meta.description?.slice(0, 4000) || '';
  }

  // 작성자(채널) 댓글만 필터링
  const ownerComments = await getOwnerComments(videoId, meta.channelId);

  return {
    title: meta.title,
    author: meta.channelTitle,
    authorId: meta.channelId,
    description: meta.description,
    transcript,
    ownerComments,
    publishedAt: meta.publishedAt,
    thumbnailUrl: meta.thumbnailUrl,
    contentType: detected.type,
  };
}

/**
 * YouTube Data API v3로 메타데이터 조회
 * API 키 없으면 oEmbed로 fallback
 */
async function getVideoMeta(videoId) {
  if (YT_API_KEY) {
    const res = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet',
        id: videoId,
        key: YT_API_KEY,
      },
    });
    const item = res.data.items?.[0]?.snippet;
    if (!item) throw new Error('YouTube 영상을 찾을 수 없습니다.');
    return {
      title: item.title,
      description: item.description,
      channelTitle: item.channelTitle,
      channelId: item.channelId,
      publishedAt: item.publishedAt,
      thumbnailUrl: item.thumbnails?.high?.url || item.thumbnails?.default?.url,
    };
  }

  // Fallback: oEmbed (제목만 가져올 수 있음)
  const res = await axios.get(`https://www.youtube.com/oembed?url=https://youtu.be/${videoId}&format=json`);
  return {
    title: res.data.title,
    description: '',
    channelTitle: res.data.author_name,
    channelId: null,
    publishedAt: new Date().toISOString(),
    thumbnailUrl: res.data.thumbnail_url,
  };
}

/**
 * 채널 소유자가 단 댓글만 필터링
 * YouTube API 필요 (없으면 빈 배열 반환)
 */
async function getOwnerComments(videoId, channelId) {
  if (!YT_API_KEY || !channelId) return [];

  try {
    const res = await axios.get('https://www.googleapis.com/youtube/v3/commentThreads', {
      params: {
        part: 'snippet',
        videoId,
        maxResults: 50,
        key: YT_API_KEY,
      },
    });

    return res.data.items
      .filter(item => {
        const comment = item.snippet.topLevelComment.snippet;
        return comment.authorChannelId?.value === channelId;
      })
      .map(item => item.snippet.topLevelComment.snippet.textDisplay);
  } catch {
    return [];
  }
}

/**
 * 채널의 최신 영상 URL 목록 (스케줄 수집용)
 */
async function getLatestVideos(channelId, maxResults = 5) {
  if (!YT_API_KEY) {
    console.warn('  YouTube API 키 없음 — 채널 수집 불가');
    return [];
  }

  const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      channelId,
      order: 'date',
      maxResults,
      type: 'video',
      key: YT_API_KEY,
    },
  });

  return res.data.items.map(
    item => `https://www.youtube.com/watch?v=${item.id.videoId}`
  );
}

module.exports = { scrapeYouTube, getLatestVideos };
