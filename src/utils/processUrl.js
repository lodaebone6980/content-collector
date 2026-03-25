const { detectPlatform } = require('./platformDetect');
const { scrapeYouTube } = require('../scrapers/youtube');
const { scrapeThreads } = require('../scrapers/threads');
const { scrapeInstagram } = require('../scrapers/instagram');
const { analyzeContent } = require('../analyzer/ai');
const { saveToNotion } = require('../notion/client');
const { captureKeyframes } = require('./keyframes');

/**
 * 단일 URL을 수집 → 분석 → 저장합니다.
 * @param {string} url
 * @param {string} source - 'schedule' | 'telegram' | 'discord' | 'extension' | 'manual-api'
 * @param {string[]} extraTags - 사용자가 수동으로 붙인 태그
 */
async function processUrl(url, source = 'schedule', extraTags = []) {
  const detected = detectPlatform(url);
  console.log(`  🔍 [${detected.platform}/${detected.type}] ${url}`);

  // 1. 플랫폼별 스크래핑
  let raw;
  switch (detected.platform) {
    case 'youtube':
      raw = await scrapeYouTube(url, detected);
      break;
    case 'threads':
      raw = await scrapeThreads(url, detected);
      break;
    case 'instagram':
      raw = await scrapeInstagram(url, detected);
      break;
    default:
      throw new Error(`지원하지 않는 플랫폼입니다: ${url}`);
  }

  // 2. 영상 키프레임 캡처 (YouTube, Instagram Reels)
  try {
    const keyframes = await captureKeyframes(url, detected.platform, detected);
    if (keyframes.length > 0) {
      raw.keyframes = keyframes;
    }
  } catch (err) {
    console.warn(`  ⚠️  키프레임 캡처 실패: ${err.message}`);
  }

  // 3. AI 분석 (요약 + 태그 자동 생성 + 이미지 분석)
  const analyzed = await analyzeContent(raw);

  // 4. Notion 저장
  const notionPage = await saveToNotion({
    ...raw,
    ...analyzed,
    url,
    source,
    platform: detected.platform,
    contentType: detected.type,
    tags: [...new Set([...analyzed.tags, ...extraTags])],
    collectedAt: new Date().toISOString(),
  });

  return {
    title: raw.title,
    summary: analyzed.summary,
    tags: [...new Set([...analyzed.tags, ...extraTags])],
    notionUrl: notionPage.url,
  };
}

/**
 * 스케줄 실행 시 구독 목록 전체를 순회합니다.
 * @param {{ youtube: string[], threads: string[], instagram: string[] }} watchlist
 */
async function runCollectionCycle(watchlist) {
  const stats = { youtube: 0, threads: 0, instagram: 0, total: 0 };

  // YouTube 채널 최신 영상
  for (const channelId of watchlist.youtube) {
    try {
      const { getLatestVideos } = require('../scrapers/youtube');
      const videos = await getLatestVideos(channelId);
      for (const videoUrl of videos) {
        await processUrl(videoUrl, 'schedule');
        stats.youtube++;
        stats.total++;
      }
    } catch (err) {
      console.error(`  ⚠️  YouTube 채널 오류 (${channelId}): ${err.message}`);
    }
  }

  // Threads 계정 최신 게시글
  for (const username of watchlist.threads) {
    try {
      const { getLatestPosts } = require('../scrapers/threads');
      const posts = await getLatestPosts(username);
      for (const postUrl of posts) {
        await processUrl(postUrl, 'schedule');
        stats.threads++;
        stats.total++;
      }
    } catch (err) {
      console.error(`  ⚠️  Threads 오류 (${username}): ${err.message}`);
    }
  }

  // Instagram 계정 최신 게시물
  for (const username of watchlist.instagram) {
    try {
      const { getLatestPosts } = require('../scrapers/instagram');
      const posts = await getLatestPosts(username);
      for (const postUrl of posts) {
        await processUrl(postUrl, 'schedule');
        stats.instagram++;
        stats.total++;
      }
    } catch (err) {
      console.error(`  ⚠️  Instagram 오류 (${username}): ${err.message}`);
    }
  }

  return stats;
}

module.exports = { processUrl, runCollectionCycle };
