const puppeteer = require('puppeteer');

let browser = null;

/**
 * Puppeteer 브라우저 싱글톤
 * 여러 스크래퍼가 동일한 브라우저 인스턴스를 공유합니다.
 */
async function getBrowser() {
  if (browser && browser.connected) return browser;

  const launchOptions = {
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
    ],
  };

  // Railway/Render 등 배포 환경에서 시스템 Chromium 사용
  if (process.env.CHROMIUM_PATH) {
    launchOptions.executablePath = process.env.CHROMIUM_PATH;
  }

  browser = await puppeteer.launch(launchOptions);
  return browser;
}

async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

// 프로세스 종료 시 브라우저 정리
process.on('SIGINT', closeBrowser);
process.on('SIGTERM', closeBrowser);

module.exports = { getBrowser, closeBrowser };
