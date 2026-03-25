const axios = require('axios');
const cheerio = require('cheerio');
const { getBrowser } = require('../utils/browser');

/**
 * Threads 단건 게시글 스크래핑
 * Puppeteer 우선, oEmbed + HTML 파싱 fallback
 */
async function scrapeThreads(url, detected) {
  // Puppeteer로 전체 데이터 추출 시도
  try {
    const result = await scrapeWithPuppeteer(url, detected);
    if (result.text) return result;
  } catch (err) {
    console.warn(`  ⚠️  Threads Puppeteer 실패, fallback 사용: ${err.message}`);
  }

  // Fallback: oEmbed + HTML 파싱
  return scrapeWithFallback(url, detected);
}

/**
 * Puppeteer로 Threads 게시글 풀 스크래핑
 */
async function scrapeWithPuppeteer(url, detected) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // 페이지 렌더링 대기
  await page.waitForSelector('[data-pressable-container]', { timeout: 10000 }).catch(() => null);
  await new Promise(r => setTimeout(r, 2000));

  const data = await page.evaluate(() => {
    // 게시글 텍스트 추출
    const textBlocks = document.querySelectorAll('[data-pressable-container] span');
    const texts = [];
    textBlocks.forEach(el => {
      const t = el.textContent?.trim();
      if (t && t.length > 5) texts.push(t);
    });

    // 이미지 추출
    const images = [];
    document.querySelectorAll('[data-pressable-container] img').forEach(img => {
      const src = img.src || img.getAttribute('srcset')?.split(' ')[0];
      if (src && !src.includes('profile') && !src.includes('avatar') && src.startsWith('http')) {
        images.push(src);
      }
    });

    // 작성자 정보
    const authorEl = document.querySelector('a[role="link"] span');
    const author = authorEl?.textContent?.trim() || '';

    return { texts, images, author };
  });

  // 작성자 댓글 추출 (본문 아래 같은 작성자의 답글)
  const ownerComments = await extractOwnerComments(page, detected.username || data.author);

  await page.close();

  const uniqueImages = [...new Set(data.images)];

  return {
    title: `Threads @${detected.username || data.author}`,
    text: data.texts.join('\n') || '',
    author: detected.username || data.author,
    images: uniqueImages,
    ownerComments,
    publishedAt: new Date().toISOString(),
    contentType: 'post',
  };
}

/**
 * 게시글 아래에서 작성자 본인의 답글만 추출
 */
async function extractOwnerComments(page, authorUsername) {
  if (!authorUsername) return [];

  try {
    const comments = await page.evaluate((username) => {
      const results = [];
      // 답글 영역에서 같은 username의 댓글만 추출
      const allLinks = document.querySelectorAll('a[href*="/@"]');
      allLinks.forEach(link => {
        const href = link.getAttribute('href') || '';
        if (href.includes(`/@${username}`)) {
          const container = link.closest('[data-pressable-container]');
          if (container) {
            const spans = container.querySelectorAll('span');
            spans.forEach(span => {
              const text = span.textContent?.trim();
              if (text && text.length > 10 && !text.startsWith('@')) {
                results.push(text);
              }
            });
          }
        }
      });
      return [...new Set(results)];
    }, authorUsername);

    return comments.slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * Fallback: oEmbed + HTML 메타 태그 파싱
 */
async function scrapeWithFallback(url, detected) {
  let title = '';
  let text = '';
  let author = detected.username || '';
  let images = [];

  try {
    const oembed = await axios.get(
      `https://www.threads.net/oembed/?url=${encodeURIComponent(url)}`,
      { timeout: 10000 }
    );
    title = oembed.data.title || '';
    author = oembed.data.author_name || author;
  } catch {
    // oEmbed 실패
  }

  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentBot/1.0)',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });
    const $ = cheerio.load(res.data);
    text = $('meta[property="og:description"]').attr('content') || '';
    title = title || $('meta[property="og:title"]').attr('content') || '';
    const imgUrl = $('meta[property="og:image"]').attr('content');
    if (imgUrl) images = [imgUrl];
  } catch (err) {
    console.warn(`    Threads HTML 파싱 실패: ${err.message}`);
  }

  return {
    title: title || `Threads @${author}`,
    text,
    author,
    images,
    ownerComments: [],
    publishedAt: new Date().toISOString(),
    contentType: 'post',
  };
}

/**
 * 계정의 최신 게시글 URL 목록 (스케줄 수집용)
 */
async function getLatestPosts(username, maxResults = 5) {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(`https://www.threads.net/@${username}`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await new Promise(r => setTimeout(r, 3000));

    const postUrls = await page.evaluate((max) => {
      const links = [];
      document.querySelectorAll('a[href*="/post/"]').forEach(a => {
        const href = a.getAttribute('href');
        if (href && !links.includes(href)) {
          links.push(`https://www.threads.net${href}`);
        }
      });
      return links.slice(0, max);
    }, maxResults);

    await page.close();
    return postUrls;
  } catch (err) {
    console.warn(`  ⚠️  Threads @${username} 자동 수집 실패: ${err.message}`);
    return [];
  }
}

module.exports = { scrapeThreads, getLatestPosts };
