const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk');
const { fetchImageAsBase64 } = require('../utils/imageUtils');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MULTIMODAL_ENABLED = () => process.env.MULTIMODAL_ENABLED !== 'false';
const MAX_IMAGES = () => parseInt(process.env.MAX_IMAGES_PER_ANALYSIS || '5', 10);

/**
 * 스크래핑된 원본 데이터를 AI로 분석하여 요약, 태그, 주제를 추출합니다.
 * 이미지가 있으면 Claude Vision으로 멀티모달 분석합니다.
 */
async function analyzeContent(raw) {
  const hasImages = MULTIMODAL_ENABLED() && (
    (raw.images && raw.images.length > 0) ||
    (raw.keyframes && raw.keyframes.length > 0)
  );

  try {
    if (hasImages) {
      return await analyzeMultimodal(raw);
    }
    return await analyzeTextOnly(raw);
  } catch (err) {
    console.error(`  ⚠️  AI 분석 오류: ${err.message}`);
    return fallbackResult(raw);
  }
}

/**
 * 텍스트만 분석 (기존 방식)
 */
async function analyzeTextOnly(raw) {
  const contentText = buildContentText(raw);

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildTextPrompt(contentText) }],
  });

  return parseResponse(message.content[0].text);
}

/**
 * 멀티모달 분석 (텍스트 + 이미지)
 */
async function analyzeMultimodal(raw) {
  const contentBlocks = [];

  // 텍스트 콘텐츠
  const contentText = buildContentText(raw);
  contentBlocks.push({ type: 'text', text: buildMultimodalPrompt(contentText) });

  // 이미지 추가 (URL에서 다운로드)
  const maxImages = MAX_IMAGES();
  const imageUrls = (raw.images || []).slice(0, maxImages);

  for (const imgUrl of imageUrls) {
    try {
      const { base64, mediaType } = await fetchImageAsBase64(imgUrl);
      contentBlocks.push({
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      });
    } catch (err) {
      console.warn(`  ⚠️  이미지 로드 실패 (${imgUrl}): ${err.message}`);
    }
  }

  // 키프레임 추가 (Buffer에서 직접)
  const keyframes = (raw.keyframes || []).slice(0, Math.max(0, maxImages - imageUrls.length));
  for (const frame of keyframes) {
    contentBlocks.push({
      type: 'image',
      source: { type: 'base64', media_type: frame.mimeType, data: frame.buffer.toString('base64') },
    });
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1536,
    messages: [{ role: 'user', content: contentBlocks }],
  });

  return parseResponse(message.content[0].text);
}

function buildTextPrompt(contentText) {
  return `다음 SNS 콘텐츠를 분석해주세요.

콘텐츠:
${contentText}

아래 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "summary": "핵심 내용 2~3문장 요약",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "tags": ["태그1", "태그2", "태그3"],
  "topic": "주제 한 줄 (예: AI 마케팅 전략)",
  "ownerCommentSummary": "작성자 댓글/답글 핵심 내용 (있을 경우)"
}`;
}

function buildMultimodalPrompt(contentText) {
  return `다음 SNS 콘텐츠를 텍스트와 이미지 모두 분석해주세요.
이미지에 텍스트가 있으면 OCR로 읽어서 내용에 포함해주세요.
카드뉴스나 슬라이드 형식이면 각 장의 핵심 내용을 정리해주세요.

콘텐츠:
${contentText}

아래 JSON 형식으로만 응답해주세요 (다른 텍스트 없이):
{
  "summary": "핵심 내용 2~3문장 요약 (이미지 내용 포함)",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "tags": ["태그1", "태그2", "태그3"],
  "topic": "주제 한 줄 (예: AI 마케팅 전략)",
  "ownerCommentSummary": "작성자 댓글/답글 핵심 내용 (있을 경우)",
  "imageAnalysis": "이미지/영상 시각적 콘텐츠 분석 요약 (OCR 텍스트 포함)"
}`;
}

function buildContentText(raw) {
  const parts = [];

  if (raw.title) parts.push(`제목: ${raw.title}`);
  if (raw.author) parts.push(`작성자: ${raw.author}`);
  if (raw.text) parts.push(`본문: ${raw.text.slice(0, 2000)}`);
  if (raw.caption) parts.push(`캡션: ${raw.caption.slice(0, 1000)}`);
  if (raw.description) parts.push(`설명: ${raw.description.slice(0, 1000)}`);
  if (raw.transcript) parts.push(`트랜스크립트: ${raw.transcript.slice(0, 4000)}`);
  if (raw.ownerComments?.length) {
    parts.push(`작성자 댓글:\n${raw.ownerComments.slice(0, 5).join('\n')}`);
  }

  return parts.join('\n\n');
}

function parseResponse(responseText) {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('JSON 파싱 실패');
  return JSON.parse(jsonMatch[0]);
}

function fallbackResult(raw) {
  return {
    summary: raw.text || raw.caption || raw.transcript?.slice(0, 200) || '요약 없음',
    keyPoints: [],
    tags: [],
    topic: raw.title || '미분류',
    ownerCommentSummary: '',
    imageAnalysis: '',
  };
}

module.exports = { analyzeContent };
