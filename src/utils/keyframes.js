const axios = require('axios');
const { getBrowser } = require('./browser');

/**
 * 영상 콘텐츠의 키프레임(썸네일) 이미지를 가져옵니다.
 * YouTube는 API 제공 썸네일, Instagram Reels는 Puppeteer 캡처
 */
async function captureKeyframes(url, platform, detected) {
  const maxFrames = parseInt(process.env.MAX_KEYFRAMES || '4', 10);

  if (platform === 'youtube') {
    return captureYouTubeKeyframes(detected.id, maxFrames);
  }

  if (platform === 'instagram' && detected.type === 'reel') {
    return captureReelKeyframes(url, maxFrames);
  }

  return [];
}

/**
 * YouTube 썸네일 API에서 키프레임 가져오기 (Puppeteer 불필요)
 */
async function captureYouTubeKeyframes(videoId, maxFrames) {
  const urls = [
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/0.jpg`,
    `https://img.youtube.com/vi/${videoId}/1.jpg`,
    `https://img.youtube.com/vi/${videoId}/2.jpg`,
    `https://img.youtube.com/vi/${videoId}/3.jpg`,
  ].slice(0, maxFrames);

  const frames = [];
  for (const frameUrl of urls) {
    try {
      const res = await axios.get(frameUrl, { responseType: 'arraybuffer', timeout: 5000 });
      if (res.status === 200 && res.data.length > 1000) {
        frames.push({
          buffer: Buffer.from(res.data),
          url: frameUrl,
          mimeType: 'image/jpeg',
        });
      }
    } catch {
      // 고해상도 없으면 건너뜀
    }
  }
  return frames;
}

/**
 * Instagram Reels 영상에서 Puppeteer로 키프레임 캡처
 */
async function captureReelKeyframes(url, maxFrames) {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('video', { timeout: 10000 }).catch(() => null);

    // 비디오 요소에서 포스터 이미지 추출
    const posterUrl = await page.evaluate(() => {
      const video = document.querySelector('video');
      return video?.poster || null;
    });

    const frames = [];
    if (posterUrl) {
      try {
        const res = await axios.get(posterUrl, { responseType: 'arraybuffer', timeout: 5000 });
        frames.push({
          buffer: Buffer.from(res.data),
          url: posterUrl,
          mimeType: 'image/jpeg',
        });
      } catch {
        // 포스터 다운로드 실패
      }
    }

    // 비디오가 없으면 페이지 스크린샷을 키프레임으로 사용
    if (frames.length === 0) {
      const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
      frames.push({
        buffer: screenshot,
        url: null,
        mimeType: 'image/jpeg',
      });
    }

    await page.close();
    return frames.slice(0, maxFrames);
  } catch (err) {
    console.warn(`  ⚠️  Reel 키프레임 캡처 실패: ${err.message}`);
    return [];
  }
}

module.exports = { captureKeyframes };
