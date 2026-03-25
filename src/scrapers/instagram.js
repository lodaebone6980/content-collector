const axios = require('axios');
const cheerio = require('cheerio');
const { getBrowser } = require('../utils/browser');

/**
 * Instagram 단건 스크래핑 (릴스 / 카드뉴스)
 * Puppeteer 우선, oEmbed + HTML 파싱 fallback
 */
async function scrapeInstagram(url, detected) {
  // Puppeteer로 전체 데이터 추출 시도
  try {
    const result = await scrapeWithPuppeteer(url, detected);
    if (result.caption || result.images.length > 0) return result;
  } catch (err) {
    console.warn(`  ⚠️  Instagram Puppeteer 실패, fallback 사용: ${err.message}`);
  }

  // Fallback: oEmbed + HTML 파싱
  return scrapeWithFallback(url, detected);
}

/**
 * Puppeteer로 Instagram 게시물 풀 스크래핑
 * 캐러셀(카드뉴스)은 전체 이미지 추출
 */
async function scrapeWithPuppeteer(url, detected) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 900 });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // 기본 정보 추출
  const data = await page.evaluate(() => {
    const caption = document.querySelector('meta[property="og:description"]')?.content || '';
    const title = document.querySelector('meta[property="og:title"]')?.content || '';
    const author = (() => {
      const match = title.match(/@(\w+)/);
      return match ? match[1] : '';
    })();

    // 현재 보이는 이미지 추출
    const images = [];
    document.querySelectorAll('article img').forEach(img => {
      const src = img.src;
      if (src && !src.includes('profile') && !src.includes('avatar') && src.startsWith('http')) {
        images.push(src);
      }
    });

    return { caption, title, author, images };
  });

  // 캐러셀(카드뉴스): 다음 버튼 클릭하며 모든 이미지 수집
  let allImages = [...data.images];
  if (detected.type === 'post') {
    const carouselImages = await extractCarouselImages(page);
    allImages = [...new Set([...allImages, ...carouselImages])];
  }

  // 작성자 댓글 추출
  const ownerComments = await extractOwnerComments(page, data.author);

  await page.close();

  return {
    title: data.title || `Instagram @${data.author}`,
    caption: data.caption,
    author: data.author,
    images: allImages,
    isCarousel: allImages.length > 1,
    ownerComments,
    publishedAt: new Date().toISOString(),
    contentType: detected.type,
  };
}

/**
 * 캐러셀 다음 버튼을 클릭하며 모든 이미지 URL 수집
 */
async function extractCarouselImages(page) {
  const images = [];
  const maxSlides = 10;

  for (let i = 0; i < maxSlides; i++) {
    // 다음 버튼 찾기
    const nextBtn = await page.$('button[aria-label="Next"], button[aria-label="다음"]');
    if (!nextBtn) break;

    await nextBtn.click();
    await new Promise(r => setTimeout(r, 800));

    // 현재 슬라이드의 이미지 추출
    const slideImages = await page.evaluate(() => {
      const imgs = [];
      document.querySelectorAll('article img').forEach(img => {
        const src = img.src;
        if (src && !src.includes('profile') && !src.includes('avatar') && src.startsWith('http')) {
          imgs.push(src);
        }
      });
      return imgs;
    });

    images.push(...slideImages);
  }

  return images;
}

/**
 * 댓글 섹션에서 게시물 작성자의 댓글만 추출
 */
async function extractOwnerComments(page, authorUsername) {
  if (!authorUsername) return [];

  try {
    const comments = await page.evaluate((username) => {
      const results = [];
      // 댓글 영역에서 작성자 이름이 포함된 댓글 추출
      const commentEls = document.querySelectorAll('ul ul span');
      let isOwnerComment = false;

      commentEls.forEach(el => {
        const text = el.textContent?.trim();
        if (!text) return;

        // 작성자 이름이 나오면 다음 span이 댓글 내용
        if (text === username) {
          isOwnerComment = true;
          return;
        }
        if (isOwnerComment && text.length > 5) {
          results.push(text);
          isOwnerComment = false;
        }
      });

      return results;
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
  let caption = '';
  let author = '';
  let images = [];

  try {
    const oembed = await axios.get(
      `https://www.instagram.com/api/oembed/?url=${encodeURIComponent(url)}&hidecaption=false`,
      { timeout: 10000 }
    );
    caption = oembed.data.title || '';
    author = oembed.data.author_name || '';
    title = `Instagram @${author}`;
    if (oembed.data.thumbnail_url) images = [oembed.data.thumbnail_url];
  } catch {
    // fallback
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
    caption = caption || $('meta[property="og:description"]').attr('content') || '';
    title = title || $('meta[property="og:title"]').attr('content') || `Instagram ${detected.type}`;
    const img = $('meta[property="og:image"]').attr('content');
    if (img && !images.includes(img)) images.push(img);
  } catch (err) {
    console.warn(`    Instagram HTML 파싱 실패: ${err.message}`);
  }

  return {
    title,
    caption,
    author,
    images,
    isCarousel: detected.type === 'post',
    ownerComments: [],
    publishedAt: new Date().toISOString(),
    contentType: detected.type,
  };
}

/**
 * 계정 최신 게시물 URL 목록 (스케줄 수집용)
 */
async function getLatestPosts(username, maxResults = 5) {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await new Promise(r => setTimeout(r, 3000));

    const postUrls = await page.evaluate((max) => {
      const links = [];
      document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]').forEach(a => {
        const href = a.getAttribute('href');
        if (href && !links.some(l => l.includes(href))) {
          links.push(`https://www.instagram.com${href}`);
        }
      });
      return links.slice(0, max);
    }, maxResults);

    await page.close();
    return postUrls;
  } catch (err) {
    console.warn(`  ⚠️  Instagram @${username} 자동 수집 실패: ${err.message}`);
    return [];
  }
}

module.exports = { scrapeInstagram, getLatestPosts };
