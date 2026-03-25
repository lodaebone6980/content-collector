# Skill: Notion 저장 필드 추가/수정

## 언제 사용하나
- Notion 블록에 새 정보를 추가하고 싶을 때 (예: 조회수, 좋아요 수, 썸네일)
- 날짜 페이지 속성을 추가/변경할 때
- 블록 레이아웃을 변경할 때

---

## Notion 저장 구조 이해

```
notion/client.js
  ├── saveToNotion()           ← 외부에서 호출하는 진입점
  ├── getOrCreateDatePage()    ← 날짜 페이지 생성/조회
  ├── appendContentBlock()     ← 실제 블록 내용 구성 ← 여기를 주로 수정
  └── updateDatePageTopics()   ← 상단 Topics 속성 업데이트
```

---

## 블록에 새 정보 추가하기

### 예시: 조회수 추가

`appendContentBlock()` 함수 내 blocks 배열에 항목 추가:

```js
// 기존 paragraph (태그/메타) 위에 추가
if (data.viewCount) {
  blocks.push({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{
        type: 'text',
        text: { content: `👁 조회수: ${data.viewCount.toLocaleString()}` },
        annotations: { color: 'gray' },
      }],
    },
  });
}
```

### 스크래퍼에서 데이터 추가로 가져오기

1. 스크래퍼 파일에서 필드 추가:
```js
// scrapers/youtube.js
return {
  ...기존필드,
  viewCount: meta.statistics?.viewCount || 0,
};
```

2. `processUrl.js`는 raw 데이터를 그대로 전달하므로 별도 수정 불필요.

---

## 날짜 페이지 DB 속성 추가하기

`getOrCreateDatePage()` 내 `notion.pages.create()` 호출의 properties에 추가:

```js
properties: {
  Name: { title: [...] },
  Date: { date: { start: dateStr } },
  Topics: { rich_text: [...] },
  // 추가 예시: 수집 건수
  Count: { number: 0 },
},
```

> ⚠️ Notion DB에도 동일한 속성이 있어야 함. 없으면 API 오류 발생.
> Notion 대시보드에서 직접 속성 추가 후 코드 수정할 것.

---

## 썸네일 이미지 추가하기

Notion 블록의 image 타입 사용:

```js
if (data.thumbnailUrl) {
  blocks.unshift({  // callout 앞에 삽입
    object: 'block',
    type: 'image',
    image: {
      type: 'external',
      external: { url: data.thumbnailUrl },
    },
  });
}
```

---

## Notion API 블록 타입 레퍼런스

| 타입 | 용도 |
|---|---|
| `paragraph` | 일반 텍스트 |
| `heading_1/2/3` | 섹션 제목 |
| `callout` | 강조 블록 (아이콘 + 텍스트) |
| `bulleted_list_item` | 불릿 목록 |
| `numbered_list_item` | 번호 목록 |
| `quote` | 인용구 |
| `divider` | 구분선 |
| `image` | 이미지 (external URL) |
| `bookmark` | URL 북마크 카드 |
| `toggle` | 접기/펼치기 |

---

## 주의사항
- Notion API는 한 번에 최대 100개 블록만 추가 가능
- 블록 추가 실패는 throw → 사용자에게 알림 (데이터 유실 방지)
- 이미 저장된 페이지 구조 변경 시 기존 데이터에는 영향 없음 (새 수집분부터 적용)
- `datePageCache` 초기화 필요 시: `datePageCache.clear()` 또는 서버 재시작
