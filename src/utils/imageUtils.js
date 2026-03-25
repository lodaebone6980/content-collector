const axios = require('axios');
const sharp = require('sharp');

const MAX_WIDTH = 1024;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * 이미지 URL을 다운로드하여 base64로 변환합니다.
 * Claude Vision API에 전달하기 위한 형식입니다.
 */
async function fetchImageAsBase64(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 15000,
    maxContentLength: MAX_SIZE_BYTES,
  });

  const contentType = res.headers['content-type'] || 'image/jpeg';
  const mediaType = contentType.split(';')[0].trim();

  // 이미지 리사이즈 (토큰 절약)
  const resized = await resizeIfNeeded(Buffer.from(res.data), MAX_WIDTH);
  const base64 = resized.toString('base64');

  return { base64, mediaType };
}

/**
 * 이미지가 maxWidth보다 크면 리사이즈합니다.
 */
async function resizeIfNeeded(buffer, maxWidth) {
  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata.width && metadata.width > maxWidth) {
      return await sharp(buffer)
        .resize(maxWidth, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    }
    return buffer;
  } catch {
    return buffer;
  }
}

module.exports = { fetchImageAsBase64, resizeIfNeeded };
