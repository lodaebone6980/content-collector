const { Client } = require('@notionhq/client');

const notion = process.env.NOTION_TOKEN
  ? new Client({ auth: process.env.NOTION_TOKEN })
  : null;
const ROOT_DB_ID = process.env.NOTION_ROOT_DB_ID;

// 날짜 페이지 캐시 (같은 날 중복 생성 방지)
const datePageCache = new Map();

/**
 * Notion에 콘텐츠를 저장합니다.
 * 구조: Root DB → 날짜 페이지 → 플랫폼 섹션 → 콘텐츠 블록
 */
async function saveToNotion(data) {
  if (!notion) throw new Error('NOTION_TOKEN이 설정되지 않았습니다');

  // 1. 날짜 페이지 확인/생성
  const datePageId = await getOrCreateDatePage(data.collectedAt);

  // 2. 날짜 페이지에 콘텐츠 블록 추가
  const block = await appendContentBlock(datePageId, data);

  // 3. 날짜 페이지 제목의 주제 키워드 업데이트
  await updateDatePageTopics(datePageId, data.topic);

  return { url: `https://notion.so/${datePageId.replace(/-/g, '')}` };
}

/**
 * 날짜별 페이지 가져오기 또는 생성
 * 페이지 제목 형식: 2025-03-25 (화)
 */
async function getOrCreateDatePage(isoDate) {
  const kstDate = new Date(new Date(isoDate).getTime() + 9 * 60 * 60 * 1000);
  const dateStr = kstDate.toISOString().slice(0, 10);

  if (datePageCache.has(dateStr)) return datePageCache.get(dateStr);

  // Root DB에서 날짜 페이지 검색
  const search = await notion.databases.query({
    database_id: ROOT_DB_ID,
    filter: {
      property: 'Date',
      date: { equals: dateStr },
    },
  });

  if (search.results.length > 0) {
    const pageId = search.results[0].id;
    datePageCache.set(dateStr, pageId);
    return pageId;
  }

  // 없으면 새로 생성
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[kstDate.getDay()];
  const title = `${dateStr} (${dayName})`;

  const page = await notion.pages.create({
    parent: { database_id: ROOT_DB_ID },
    properties: {
      Name: {
        title: [{ text: { content: title } }],
      },
      Date: {
        date: { start: dateStr },
      },
      Topics: {
        rich_text: [{ text: { content: '' } }],
      },
    },
    children: [
      heading('YouTube'),
      heading('Threads'),
      heading('Instagram'),
    ],
  });

  datePageCache.set(dateStr, page.id);
  return page.id;
}

/**
 * 날짜 페이지에 콘텐츠 블록 추가
 */
async function appendContentBlock(pageId, data) {
  const platformEmoji = {
    youtube: '▶',
    threads: '◎',
    instagram: '◈',
  };

  const emoji = platformEmoji[data.platform] || '•';
  const sourceLabel = data.source === 'schedule' ? '자동' : '수동';

  const blocks = [
    {
      object: 'block',
      type: 'callout',
      callout: {
        rich_text: [
          { type: 'text', text: { content: `${emoji} ${data.title}`, link: { url: data.url } } },
        ],
        color: platformColor(data.platform),
        icon: { type: 'emoji', emoji: sourceLabel === '자동' ? '🕐' : '📌' },
      },
    },
    {
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{ type: 'text', text: { content: `요약: ${data.summary}` } }],
      },
    },
  ];

  // 핵심 포인트
  if (data.keyPoints?.length) {
    for (const point of data.keyPoints) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: point } }],
        },
      });
    }
  }

  // 작성자 댓글 요약
  if (data.ownerCommentSummary) {
    blocks.push({
      object: 'block',
      type: 'quote',
      quote: {
        rich_text: [{ type: 'text', text: { content: `작성자 메모: ${data.ownerCommentSummary}` } }],
      },
    });
  }

  // 이미지 분석 결과 (멀티모달)
  if (data.imageAnalysis) {
    blocks.push({
      object: 'block',
      type: 'toggle',
      toggle: {
        rich_text: [{ type: 'text', text: { content: '🖼 이미지/영상 분석' }, annotations: { bold: true } }],
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: data.imageAnalysis } }],
            },
          },
        ],
      },
    });
  }

  // 대표 이미지 (첫 번째 이미지)
  const firstImage = data.images?.[0] || data.thumbnailUrl;
  if (firstImage) {
    blocks.push({
      object: 'block',
      type: 'image',
      image: {
        type: 'external',
        external: { url: firstImage },
      },
    });
  }

  // 태그 + 메타
  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [
        {
          type: 'text',
          text: { content: `🏷 ${data.tags.join(' · ')}  |  ${sourceLabel} 수집  |  ${data.platform}` },
          annotations: { color: 'gray' },
        },
      ],
    },
  });

  blocks.push({ object: 'block', type: 'divider', divider: {} });

  await notion.blocks.children.append({
    block_id: pageId,
    children: blocks,
  });
}

/**
 * 날짜 페이지 Topics 속성에 주제 키워드 누적
 */
async function updateDatePageTopics(pageId, newTopic) {
  if (!newTopic) return;
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const existing = page.properties?.Topics?.rich_text?.[0]?.text?.content || '';
    const topics = existing ? existing.split(' · ') : [];
    if (!topics.includes(newTopic)) {
      topics.push(newTopic);
      await notion.pages.update({
        page_id: pageId,
        properties: {
          Topics: {
            rich_text: [{ text: { content: topics.slice(-6).join(' · ') } }],
          },
        },
      });
    }
  } catch {
    // Topics 업데이트 실패는 무시
  }
}

function heading(text) {
  return {
    object: 'block',
    type: 'heading_2',
    heading_2: {
      rich_text: [{ type: 'text', text: { content: text } }],
    },
  };
}

function platformColor(platform) {
  const map = { youtube: 'red_background', threads: 'purple_background', instagram: 'orange_background' };
  return map[platform] || 'default';
}

/**
 * 오늘 수집 통계 조회
 */
async function getTodayStats() {
  if (!notion) throw new Error('NOTION_TOKEN이 설정되지 않았습니다');
  const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const dateStr = kstDate.toISOString().slice(0, 10);

  const search = await notion.databases.query({
    database_id: ROOT_DB_ID,
    filter: { property: 'Date', date: { equals: dateStr } },
  });

  if (search.results.length === 0) {
    return { youtube: 0, threads: 0, instagram: 0, total: 0, date: dateStr };
  }

  const pageId = search.results[0].id;
  const children = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });

  const stats = { youtube: 0, threads: 0, instagram: 0, total: 0, date: dateStr };
  let currentPlatform = null;

  for (const block of children.results) {
    if (block.type === 'heading_2') {
      const text = block.heading_2.rich_text?.[0]?.text?.content?.toLowerCase() || '';
      if (text.includes('youtube')) currentPlatform = 'youtube';
      else if (text.includes('threads')) currentPlatform = 'threads';
      else if (text.includes('instagram')) currentPlatform = 'instagram';
    } else if (block.type === 'callout' && currentPlatform) {
      stats[currentPlatform]++;
      stats.total++;
    }
  }

  return stats;
}

module.exports = { saveToNotion, getTodayStats };
