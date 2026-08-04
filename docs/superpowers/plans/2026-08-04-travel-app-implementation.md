# 여행 앱 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 혜민/민재 부부가 여행 일정을 구글시트에 저장하고, React PWA 앱에서 구글 로그인 후 예쁜 화면으로 조회하고 앱 안의 폼으로 입력할 수 있게 한다.

**Architecture:** 완전 클라이언트형 SPA (백엔드 서버 없음). 브라우저에서 Google Identity Services로 로그인해 얻은 access token으로 Google Sheets API v4를 직접 호출한다. 화면은 4개 탭(여행/구간/일정/체크리스트)을 읽어 렌더링하고, 입력 폼은 같은 API로 append/update한다. 오프라인에서는 마지막으로 불러온 일정을 localStorage 캐시에서 보여준다.

**Tech Stack:** Vite + React 18 + TypeScript, react-router-dom, vite-plugin-pwa, Vitest + @testing-library/react (테스트), Vercel (배포).

## Global Constraints

- 시계 시각(HH:MM) 표시 금지 — 모든 순서는 `order` 정수 필드로만 표현 (design-system.md 규칙 3)
- 주차(카테고리 `"주차"`)는 구간 색과 무관하게 항상 골드(`--amber`)로 표시 (design-system.md 규칙 1)
- 배경(`--bg`)은 순백 금지, 표면(`--surface`)만 순백 (design-system.md 규칙 5)
- 구간 색은 `--seg-a/a2 → --seg-b/b2 → --seg-c/c2` 순환 (design-system.md 규칙 4)
- 체크리스트는 오프라인일 때 조회만 가능, 체크 토글은 비활성화 (implementation-design.md "오프라인 지원")
- 접근 제어는 코드가 아니라 구글시트 공유 설정으로만 함 — 코드에 사용자 화이트리스트를 넣지 않는다
- 구글시트 ID: `1pmRdYeA7iqUNi3DwxferhrM63_BP-gWhSk9KOml3McU` (이미 생성됨, 4개 탭: 여행/구간/일정/체크리스트)
- Sheets API 스코프: `https://www.googleapis.com/auth/spreadsheets` (읽기+쓰기)

---

## 사전 준비: 구글시트에 컬럼 2개 추가 (수동, 1분)

계획을 짜는 중, "구간" 탭에 날짜 필드가 없으면 개요 카드에 날짜를 못 보여주고 "오늘 일정"에서 오늘이 어느 구간인지 계산할 수 없다는 걸 발견했다. **구간 탭의 E1, F1 셀에 각각 `시작일`, `종료일`을 헤더로 추가**해야 한다 (기존 데이터는 없으니 헤더만 추가하면 됨). 이후 태스크들은 이 두 컬럼이 있다고 가정한다.

## File Structure

```
travel-app/
  .env.local.example       # VITE_GOOGLE_CLIENT_ID, VITE_SHEET_ID 예시
  package.json
  vite.config.ts           # Vite + Vitest + PWA 설정
  index.html
  src/
    main.tsx
    App.tsx
    router.tsx
    styles/
      tokens.css            # design-system.md 색상/모서리/그림자 변수 (라이트+다크)
      global.css            # 리셋, 타이포그래피 베이스
    types/
      trip.ts               # Trip, Segment, ItineraryItem, ChecklistItem
    lib/
      tokenExpiry.ts
      tokenExpiry.test.ts
      tripStatus.ts          # computeTripStatus, findCurrentSegment
      tripStatus.test.ts
      segmentColor.ts
      segmentColor.test.ts
      offlineCache.ts
      offlineCache.test.ts
      sheets/
        parse.ts             # row[][] <-> 타입 객체 변환
        parse.test.ts
        client.ts             # SheetsClient (getValues/appendRow/updateRow/findRowNumberById)
        client.test.ts
    hooks/
      useOnlineStatus.ts
      useOnlineStatus.test.ts
      useGoogleAuth.ts        # GIS 연동 (수동 브라우저 검증)
    components/
      BottomNav.tsx
      BottomNav.test.tsx
      StatusBadge.tsx
      StatusBadge.test.tsx
      SegmentCoverCard.tsx
      SegmentCoverCard.test.tsx
      Timeline.tsx
      Timeline.test.tsx
    screens/
      TripListScreen.tsx
      TripOverviewScreen.tsx
      TodayScreen.tsx
      ChecklistScreen.tsx
      ChecklistScreen.test.tsx
      forms/
        TripFormScreen.tsx
        SegmentFormScreen.tsx
        ItineraryItemFormScreen.tsx
        ChecklistItemFormScreen.tsx
  public/
    icons/                   # PWA 아이콘 (192/512)
```

---

### Task 1: 프로젝트 스캐폴딩 + 디자인 토큰

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`
- Create: `src/styles/tokens.css`, `src/styles/global.css`
- Create: `.gitignore`, `.env.local.example`

**Interfaces:**
- Produces: CSS 변수 `--seg-a`, `--seg-a2`, `--seg-b`, `--seg-b2`, `--seg-c`, `--seg-c2`, `--amber`, `--amber-soft`, `--pine`, `--pine-strong`, `--ink`, `--ink-muted`, `--bg`, `--surface`, `--surface-2`, `--line`, `--radius-lg`, `--radius-md`, `--radius-sm`, `--shadow` (라이트/다크 모두 정의) — 이후 모든 컴포넌트가 이 변수만 사용한다.

- [ ] **Step 1: Vite 프로젝트 생성**

```bash
cd C:/Users/hemin/travel-app
npm create vite@latest . -- --template react-ts
```

- [ ] **Step 2: 테스트 도구 설치**

```bash
npm install
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event
npm install react-router-dom
npm install -D vite-plugin-pwa
```

- [ ] **Step 3: `vite.config.ts` 작성**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "여행 앱",
        short_name: "여행",
        start_url: "/",
        display: "standalone",
        background_color: "#FFFCF7",
        theme_color: "#FF6B00",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
  },
});
```

- [ ] **Step 4: `src/setupTests.ts` 작성**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: `package.json`에 test 스크립트 추가**

`"scripts"`에 아래 두 줄을 추가한다:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: 디자인 토큰 작성 — `src/styles/tokens.css`**

```css
:root {
  --seg-a: #FF6B00;
  --seg-a2: #FFB703;
  --seg-b: #00B8D9;
  --seg-b2: #006D77;
  --seg-c: #006D77;
  --seg-c2: #122B2D;
  --amber: #FFB703;
  --amber-soft: #FFF4DC;
  --pine: #FF6B00;
  --pine-strong: #006D77;
  --ink: #122B2D;
  --ink-muted: #66807E;
  --bg: #FFFCF7;
  --surface: #FFFFFF;
  --surface-2: #F1F4F3;
  --line: #EDE7DA;
  --radius-lg: 26px;
  --radius-md: 22px;
  --radius-sm: 10px;
  --shadow: 0 12px 24px rgba(15, 50, 52, 0.20);
  --font-display: "Apple SD Gothic Neo", "Malgun Gothic", Pretendard, system-ui;
  --font-mono: "JetBrains Mono", "SF Mono", Consolas, monospace;
}

@media (prefers-color-scheme: dark) {
  :root {
    --seg-a: #FF7A2E;
    --seg-a2: #FFC94D;
    --seg-b: #33C8E8;
    --seg-b2: #37D6C4;
    --seg-c: #37D6C4;
    --seg-c2: #0B1B1D;
    --amber: #FFC94D;
    --amber-soft: #3A2A12;
    --pine: #FF7A2E;
    --pine-strong: #37D6C4;
    --ink: #EAF3F2;
    --ink-muted: #8FADAC;
    --bg: #0B1B1D;
    --surface: #122A2C;
    --surface-2: #1A3535;
    --line: #234342;
    --shadow: 0 12px 24px rgba(0, 0, 0, 0.5);
  }
}
```

- [ ] **Step 7: 베이스 스타일 — `src/styles/global.css`**

```css
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font-display);
}
button { font-family: inherit; }
```

`src/main.tsx`에서 두 CSS 파일을 순서대로 import 한다 (`./styles/tokens.css` 다음 `./styles/global.css`).

- [ ] **Step 8: 개발 서버로 확인**

```bash
npm run dev
```
브라우저에서 `http://localhost:5173`이 뜨고 흰 화면(에러 없음)인지 확인한다.

- [ ] **Step 9: `.env.local.example` 작성**

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_SHEET_ID=1pmRdYeA7iqUNi3DwxferhrM63_BP-gWhSk9KOml3McU
```

`.gitignore`에 `.env.local`을 추가한다 (커밋되면 안 됨).

- [ ] **Step 10: git 저장소 초기화 및 첫 커밋**

```bash
git init
git add -A
git commit -m "chore: scaffold Vite+React+TS project with design tokens"
```

---

### Task 2: 구글 클라우드 OAuth 클라이언트 준비 (수동)

앱이 구글 로그인을 하려면 Google Cloud Console에서 OAuth 클라이언트 ID를 만들어야 한다. 이건 코드로 할 수 없는 수동 작업이라, 담당자(혜민)가 아래 단계를 직접 수행해야 한다.

**Interfaces:**
- Produces: `VITE_GOOGLE_CLIENT_ID` 값 (Task 7 `useGoogleAuth`가 소비함)

- [ ] **Step 1: 구글 클라우드 프로젝트 생성**

https://console.cloud.google.com 접속 → 새 프로젝트 생성 (예: "여행앱")

- [ ] **Step 2: Google Sheets API 활성화**

"API 및 서비스 > 라이브러리"에서 "Google Sheets API" 검색 후 "사용" 클릭

- [ ] **Step 3: OAuth 동의 화면 설정**

"API 및 서비스 > OAuth 동의 화면" → User Type: 외부(External) → 앱 이름/이메일 입력 → "테스트 사용자"에 혜민, 민재 구글 계정 이메일 두 개를 추가 (이렇게 하면 두 사람 계정만 로그인 가능, 심사 없이 바로 사용 가능)

- [ ] **Step 4: OAuth 클라이언트 ID 생성**

"API 및 서비스 > 사용자 인증 정보" → "사용자 인증 정보 만들기" → "OAuth 클라이언트 ID" → 애플리케이션 유형: "웹 애플리케이션" → "승인된 JavaScript 원본"에 `http://localhost:5173`과 배포될 Vercel 도메인(Task 16에서 확정)을 추가

- [ ] **Step 5: 클라이언트 ID를 `.env.local`에 저장**

`.env.local.example`을 복사해 `.env.local`을 만들고, 발급받은 클라이언트 ID를 `VITE_GOOGLE_CLIENT_ID`에 붙여넣는다. 이 파일은 git에 커밋하지 않는다 (Task 1에서 `.gitignore` 처리됨).

- [ ] **Step 6: 확인**

`.env.local`에 값이 채워졌는지, 형식이 `숫자-문자.apps.googleusercontent.com`인지 확인한다. (커밋 없음 — 이 값은 로컬 파일에만 존재)

---

### Task 3: 데이터 타입 + 시트 행 변환

**Files:**
- Create: `src/types/trip.ts`
- Create: `src/lib/sheets/parse.ts`
- Test: `src/lib/sheets/parse.test.ts`

**Interfaces:**
- Produces: `Trip`, `Segment`, `ItineraryItem`, `ChecklistItem` 타입. `parseTrips`, `tripToRow`, `parseSegments`, `segmentToRow`, `parseItineraryItems`, `itineraryItemToRow`, `parseChecklistItems`, `checklistItemToRow` 함수.

- [ ] **Step 1: 타입 정의 — `src/types/trip.ts`**

```ts
export interface Trip {
  tripId: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

export interface Segment {
  segmentId: string;
  tripId: string;
  place: string;
  order: number;
  startDate: string;
  endDate: string;
}

export interface ItineraryItem {
  itemId: string;
  segmentId: string;
  placeName: string;
  address: string;
  transport: string;
  memo: string;
  reservationNumber: string;
  category: string; // "주차" 이면 항상 골드 강조
  order: number;
}

export interface ChecklistItem {
  checkId: string;
  tripId: string;
  label: string;
  done: boolean;
}
```

- [ ] **Step 2: 실패하는 테스트 작성 — `src/lib/sheets/parse.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import {
  parseTrips,
  tripToRow,
  parseSegments,
  segmentToRow,
  parseItineraryItems,
  itineraryItemToRow,
  parseChecklistItems,
  checklistItemToRow,
} from "./parse";

describe("parseTrips", () => {
  it("converts sheet rows into Trip objects", () => {
    const rows = [["t1", "제주 여행", "2026-09-01", "2026-09-04"]];
    expect(parseTrips(rows)).toEqual([
      { tripId: "t1", name: "제주 여행", startDate: "2026-09-01", endDate: "2026-09-04" },
    ]);
  });

  it("skips rows with no ID", () => {
    expect(parseTrips([["", "빈행"]])).toEqual([]);
  });
});

describe("tripToRow", () => {
  it("converts a Trip back into a row", () => {
    const trip = { tripId: "t1", name: "제주 여행", startDate: "2026-09-01", endDate: "2026-09-04" };
    expect(tripToRow(trip)).toEqual(["t1", "제주 여행", "2026-09-01", "2026-09-04"]);
  });
});

describe("parseSegments", () => {
  it("converts sheet rows into Segment objects, parsing order as a number", () => {
    const rows = [["s1", "t1", "제주시", "1", "2026-09-01", "2026-09-02"]];
    expect(parseSegments(rows)).toEqual([
      { segmentId: "s1", tripId: "t1", place: "제주시", order: 1, startDate: "2026-09-01", endDate: "2026-09-02" },
    ]);
  });
});

describe("segmentToRow", () => {
  it("converts a Segment back into a row, formatting order as a string", () => {
    const segment = { segmentId: "s1", tripId: "t1", place: "제주시", order: 1, startDate: "2026-09-01", endDate: "2026-09-02" };
    expect(segmentToRow(segment)).toEqual(["s1", "t1", "제주시", "1", "2026-09-01", "2026-09-02"]);
  });
});

describe("parseItineraryItems", () => {
  it("converts sheet rows into ItineraryItem objects", () => {
    const rows = [["i1", "s1", "숙소 A", "제주시 어딘가", "렌터카", "체크인 3시", "R123", "숙소", "1"]];
    expect(parseItineraryItems(rows)).toEqual([
      {
        itemId: "i1",
        segmentId: "s1",
        placeName: "숙소 A",
        address: "제주시 어딘가",
        transport: "렌터카",
        memo: "체크인 3시",
        reservationNumber: "R123",
        category: "숙소",
        order: 1,
      },
    ]);
  });
});

describe("itineraryItemToRow", () => {
  it("converts an ItineraryItem back into a row", () => {
    const item = {
      itemId: "i1",
      segmentId: "s1",
      placeName: "숙소 A",
      address: "제주시 어딘가",
      transport: "렌터카",
      memo: "체크인 3시",
      reservationNumber: "R123",
      category: "숙소",
      order: 1,
    };
    expect(itineraryItemToRow(item)).toEqual(["i1", "s1", "숙소 A", "제주시 어딘가", "렌터카", "체크인 3시", "R123", "숙소", "1"]);
  });
});

describe("parseChecklistItems", () => {
  it("parses the done column as a boolean", () => {
    const rows = [
      ["c1", "t1", "여권", "TRUE"],
      ["c2", "t1", "충전기", "FALSE"],
    ];
    expect(parseChecklistItems(rows)).toEqual([
      { checkId: "c1", tripId: "t1", label: "여권", done: true },
      { checkId: "c2", tripId: "t1", label: "충전기", done: false },
    ]);
  });
});

describe("checklistItemToRow", () => {
  it("formats done as TRUE/FALSE strings", () => {
    expect(checklistItemToRow({ checkId: "c1", tripId: "t1", label: "여권", done: true })).toEqual(["c1", "t1", "여권", "TRUE"]);
    expect(checklistItemToRow({ checkId: "c2", tripId: "t1", label: "충전기", done: false })).toEqual(["c2", "t1", "충전기", "FALSE"]);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

```bash
npm test
```
Expected: FAIL — `./parse` 모듈이 없음

- [ ] **Step 4: 구현 — `src/lib/sheets/parse.ts`**

```ts
import type { Trip, Segment, ItineraryItem, ChecklistItem } from "../../types/trip";

export function parseTrips(rows: string[][]): Trip[] {
  return rows
    .filter((r) => r[0])
    .map((r) => ({ tripId: r[0], name: r[1] ?? "", startDate: r[2] ?? "", endDate: r[3] ?? "" }));
}

export function tripToRow(trip: Trip): string[] {
  return [trip.tripId, trip.name, trip.startDate, trip.endDate];
}

export function parseSegments(rows: string[][]): Segment[] {
  return rows
    .filter((r) => r[0])
    .map((r) => ({
      segmentId: r[0],
      tripId: r[1] ?? "",
      place: r[2] ?? "",
      order: Number(r[3] ?? 0),
      startDate: r[4] ?? "",
      endDate: r[5] ?? "",
    }));
}

export function segmentToRow(segment: Segment): string[] {
  return [segment.segmentId, segment.tripId, segment.place, String(segment.order), segment.startDate, segment.endDate];
}

export function parseItineraryItems(rows: string[][]): ItineraryItem[] {
  return rows
    .filter((r) => r[0])
    .map((r) => ({
      itemId: r[0],
      segmentId: r[1] ?? "",
      placeName: r[2] ?? "",
      address: r[3] ?? "",
      transport: r[4] ?? "",
      memo: r[5] ?? "",
      reservationNumber: r[6] ?? "",
      category: r[7] ?? "",
      order: Number(r[8] ?? 0),
    }));
}

export function itineraryItemToRow(item: ItineraryItem): string[] {
  return [
    item.itemId,
    item.segmentId,
    item.placeName,
    item.address,
    item.transport,
    item.memo,
    item.reservationNumber,
    item.category,
    String(item.order),
  ];
}

export function parseChecklistItems(rows: string[][]): ChecklistItem[] {
  return rows
    .filter((r) => r[0])
    .map((r) => ({ checkId: r[0], tripId: r[1] ?? "", label: r[2] ?? "", done: r[3] === "TRUE" }));
}

export function checklistItemToRow(item: ChecklistItem): string[] {
  return [item.checkId, item.tripId, item.label, item.done ? "TRUE" : "FALSE"];
}
```

- [ ] **Step 5: 테스트 통과 확인**

```bash
npm test
```
Expected: PASS (8 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/types/trip.ts src/lib/sheets/parse.ts src/lib/sheets/parse.test.ts
git commit -m "feat: add trip data types and sheet row parsers"
```

---

### Task 4: 순수 도메인 로직 — 여행 상태, 오늘의 구간, 구간 색상, 토큰 만료

**Files:**
- Create: `src/lib/tripStatus.ts`, `src/lib/tripStatus.test.ts`
- Create: `src/lib/segmentColor.ts`, `src/lib/segmentColor.test.ts`
- Create: `src/lib/tokenExpiry.ts`, `src/lib/tokenExpiry.test.ts`

**Interfaces:**
- Consumes: `Trip`, `Segment` (Task 3)
- Produces: `computeTripStatus(trip, today): "진행중"|"예정"|"완료"`, `findCurrentSegment(segments, today): Segment | undefined`, `segmentColorKey(order): "a"|"b"|"c"`, `isTokenExpired(expiresAtMs, nowMs): boolean` — Task 7, 9, 10, 11이 이 함수들을 사용한다.

- [ ] **Step 1: 실패하는 테스트 — `src/lib/tripStatus.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { computeTripStatus, findCurrentSegment } from "./tripStatus";

describe("computeTripStatus", () => {
  const trip = { startDate: "2026-09-01", endDate: "2026-09-04" };

  it("returns 예정 when today is before the start date", () => {
    expect(computeTripStatus(trip, new Date("2026-08-30"))).toBe("예정");
  });

  it("returns 진행중 when today is within the range (inclusive)", () => {
    expect(computeTripStatus(trip, new Date("2026-09-01"))).toBe("진행중");
    expect(computeTripStatus(trip, new Date("2026-09-04"))).toBe("진행중");
  });

  it("returns 완료 when today is after the end date", () => {
    expect(computeTripStatus(trip, new Date("2026-09-05"))).toBe("완료");
  });
});

describe("findCurrentSegment", () => {
  const segments = [
    { segmentId: "s1", tripId: "t1", place: "제주시", order: 1, startDate: "2026-09-01", endDate: "2026-09-02" },
    { segmentId: "s2", tripId: "t1", place: "서귀포", order: 2, startDate: "2026-09-03", endDate: "2026-09-04" },
  ];

  it("returns the segment whose date range contains today", () => {
    expect(findCurrentSegment(segments, new Date("2026-09-03"))?.segmentId).toBe("s2");
  });

  it("returns undefined when no segment matches today", () => {
    expect(findCurrentSegment(segments, new Date("2026-12-25"))).toBeUndefined();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm test
```
Expected: FAIL — `./tripStatus` 모듈이 없음

- [ ] **Step 3: 구현 — `src/lib/tripStatus.ts`**

```ts
import type { Segment } from "../types/trip";

export type TripStatus = "진행중" | "예정" | "완료";

function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function computeTripStatus(trip: { startDate: string; endDate: string }, today: Date): TripStatus {
  const start = atMidnight(new Date(trip.startDate));
  const end = atMidnight(new Date(trip.endDate));
  const now = atMidnight(today);
  if (now < start) return "예정";
  if (now > end) return "완료";
  return "진행중";
}

export function findCurrentSegment(segments: Segment[], today: Date): Segment | undefined {
  const now = atMidnight(today);
  return segments.find((s) => {
    const start = atMidnight(new Date(s.startDate));
    const end = atMidnight(new Date(s.endDate));
    return now >= start && now <= end;
  });
}
```

- [ ] **Step 4: 통과 확인**

```bash
npm test
```
Expected: PASS

- [ ] **Step 5: 실패하는 테스트 — `src/lib/segmentColor.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { segmentColorKey } from "./segmentColor";

describe("segmentColorKey", () => {
  it("cycles a -> b -> c -> a as order increases", () => {
    expect(segmentColorKey(1)).toBe("a");
    expect(segmentColorKey(2)).toBe("b");
    expect(segmentColorKey(3)).toBe("c");
    expect(segmentColorKey(4)).toBe("a");
    expect(segmentColorKey(5)).toBe("b");
  });
});
```

- [ ] **Step 6: 구현 — `src/lib/segmentColor.ts`**

```ts
export type SegmentColorKey = "a" | "b" | "c";

const KEYS: SegmentColorKey[] = ["a", "b", "c"];

export function segmentColorKey(order: number): SegmentColorKey {
  const idx = ((order - 1) % 3 + 3) % 3;
  return KEYS[idx];
}
```

- [ ] **Step 7: 실패하는 테스트 — `src/lib/tokenExpiry.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { isTokenExpired } from "./tokenExpiry";

describe("isTokenExpired", () => {
  it("returns false when the current time is before expiry", () => {
    expect(isTokenExpired(1000, 500)).toBe(false);
  });

  it("returns true when the current time is at or after expiry", () => {
    expect(isTokenExpired(1000, 1000)).toBe(true);
    expect(isTokenExpired(1000, 1500)).toBe(true);
  });
});
```

- [ ] **Step 8: 구현 — `src/lib/tokenExpiry.ts`**

```ts
export function isTokenExpired(expiresAtMs: number, nowMs: number): boolean {
  return nowMs >= expiresAtMs;
}
```

- [ ] **Step 9: 전체 테스트 통과 확인**

```bash
npm test
```
Expected: PASS (모든 테스트)

- [ ] **Step 10: 커밋**

```bash
git add src/lib/tripStatus.ts src/lib/tripStatus.test.ts src/lib/segmentColor.ts src/lib/segmentColor.test.ts src/lib/tokenExpiry.ts src/lib/tokenExpiry.test.ts
git commit -m "feat: add trip status, current-segment, segment color, and token expiry logic"
```

---

### Task 5: 오프라인 캐시 + 온라인 상태 훅

**Files:**
- Create: `src/lib/offlineCache.ts`, `src/lib/offlineCache.test.ts`
- Create: `src/hooks/useOnlineStatus.ts`, `src/hooks/useOnlineStatus.test.ts`

**Interfaces:**
- Consumes: `Segment`, `ItineraryItem` (Task 3)
- Produces: `saveItineraryCache(tripId, segments, items)`, `loadItineraryCache(tripId): CachedItinerary | null`, `useOnlineStatus(): boolean` — Task 9, 11, 12가 사용한다.

- [ ] **Step 1: 실패하는 테스트 — `src/lib/offlineCache.test.ts`**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { saveItineraryCache, loadItineraryCache } from "./offlineCache";

describe("offlineCache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing is cached for a trip", () => {
    expect(loadItineraryCache("t1")).toBeNull();
  });

  it("saves and reloads segments and items for a trip", () => {
    const segments = [{ segmentId: "s1", tripId: "t1", place: "제주시", order: 1, startDate: "2026-09-01", endDate: "2026-09-02" }];
    const items = [{ itemId: "i1", segmentId: "s1", placeName: "숙소 A", address: "", transport: "", memo: "", reservationNumber: "", category: "숙소", order: 1 }];

    saveItineraryCache("t1", segments, items);
    const cached = loadItineraryCache("t1");

    expect(cached?.tripId).toBe("t1");
    expect(cached?.segments).toEqual(segments);
    expect(cached?.items).toEqual(items);
  });

  it("keeps caches for different trips separate", () => {
    saveItineraryCache("t1", [], []);
    expect(loadItineraryCache("t2")).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm test
```
Expected: FAIL — `./offlineCache` 모듈이 없음

- [ ] **Step 3: 구현 — `src/lib/offlineCache.ts`**

```ts
import type { Segment, ItineraryItem } from "../types/trip";

const KEY_PREFIX = "travel-app:itinerary:";

export interface CachedItinerary {
  tripId: string;
  savedAt: string;
  segments: Segment[];
  items: ItineraryItem[];
}

export function saveItineraryCache(tripId: string, segments: Segment[], items: ItineraryItem[]): void {
  const payload: CachedItinerary = { tripId, savedAt: new Date().toISOString(), segments, items };
  localStorage.setItem(KEY_PREFIX + tripId, JSON.stringify(payload));
}

export function loadItineraryCache(tripId: string): CachedItinerary | null {
  const raw = localStorage.getItem(KEY_PREFIX + tripId);
  if (!raw) return null;
  return JSON.parse(raw) as CachedItinerary;
}
```

- [ ] **Step 4: 통과 확인**

```bash
npm test
```
Expected: PASS

- [ ] **Step 5: 실패하는 테스트 — `src/hooks/useOnlineStatus.test.ts`**

```ts
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useOnlineStatus } from "./useOnlineStatus";

describe("useOnlineStatus", () => {
  afterEach(() => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });

  it("reflects navigator.onLine on mount", () => {
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it("updates to false when an offline event fires", () => {
    const { result } = renderHook(() => useOnlineStatus());
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);
  });

  it("updates to true when an online event fires", () => {
    const { result } = renderHook(() => useOnlineStatus());
    act(() => {
      window.dispatchEvent(new Event("offline"));
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });
});
```

- [ ] **Step 6: 실패 확인**

```bash
npm test
```
Expected: FAIL — `./useOnlineStatus` 모듈이 없음

- [ ] **Step 7: 구현 — `src/hooks/useOnlineStatus.ts`**

```ts
import { useEffect, useState } from "react";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
```

- [ ] **Step 8: 통과 확인**

```bash
npm test
```
Expected: PASS

- [ ] **Step 9: 커밋**

```bash
git add src/lib/offlineCache.ts src/lib/offlineCache.test.ts src/hooks/useOnlineStatus.ts src/hooks/useOnlineStatus.test.ts
git commit -m "feat: add offline itinerary cache and online status hook"
```

---

### Task 6: Google Sheets API 클라이언트

**Files:**
- Create: `src/lib/sheets/client.ts`, `src/lib/sheets/client.test.ts`

**Interfaces:**
- Produces: `class SheetsClient { getValues(sheetName, range?): Promise<string[][]>; appendRow(sheetName, row): Promise<void>; updateRow(sheetName, rowNumber, row): Promise<void>; findRowNumberById(sheetName, id): Promise<number | null>; }` — Task 9~14의 화면/폼 컨테이너가 사용한다.

- [ ] **Step 1: 실패하는 테스트 — `src/lib/sheets/client.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SheetsClient } from "./client";

describe("SheetsClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: SheetsClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    client = new SheetsClient("sheet-123", () => "fake-token");
  });

  it("getValues calls the values.get endpoint with the bearer token and returns rows", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ values: [["a", "b"]] }) });

    const rows = await client.getValues("여행");

    expect(rows).toEqual([["a", "b"]]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("sheet-123");
    expect(url).toContain(encodeURIComponent("여행!A2:Z1000"));
    expect(options.headers.Authorization).toBe("Bearer fake-token");
  });

  it("getValues returns an empty array when the sheet has no values", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    expect(await client.getValues("여행")).toEqual([]);
  });

  it("getValues throws when the response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    await expect(client.getValues("여행")).rejects.toThrow("Sheets read failed: 403");
  });

  it("appendRow POSTs to the append endpoint with the row wrapped in values", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    await client.appendRow("여행", ["t1", "제주", "2026-09-01", "2026-09-04"]);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain(":append");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ values: [["t1", "제주", "2026-09-01", "2026-09-04"]] });
  });

  it("updateRow PUTs to a specific row range", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    await client.updateRow("체크리스트", 3, ["c1", "t1", "여권", "TRUE"]);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain(encodeURIComponent("체크리스트!A3:D3"));
    expect(options.method).toBe("PUT");
  });

  it("findRowNumberById returns the 1-based sheet row number for a matching id", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ values: [["c1"], ["c2"]] }) });
    expect(await client.findRowNumberById("체크리스트", "c2")).toBe(3);
  });

  it("findRowNumberById returns null when no row matches", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ values: [["c1"]] }) });
    expect(await client.findRowNumberById("체크리스트", "missing")).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm test
```
Expected: FAIL — `./client` 모듈이 없음

- [ ] **Step 3: 구현 — `src/lib/sheets/client.ts`**

```ts
const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export class SheetsClient {
  constructor(private spreadsheetId: string, private getToken: () => string) {}

  async getValues(sheetName: string, range = "A2:Z1000"): Promise<string[][]> {
    const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(`${sheetName}!${range}`)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${this.getToken()}` } });
    if (!res.ok) throw new Error(`Sheets read failed: ${res.status}`);
    const data = await res.json();
    return data.values ?? [];
  }

  async appendRow(sheetName: string, row: string[]): Promise<void> {
    const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(`${sheetName}!A1`)}:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    });
    if (!res.ok) throw new Error(`Sheets append failed: ${res.status}`);
  }

  async updateRow(sheetName: string, rowNumber: number, row: string[]): Promise<void> {
    const lastCol = String.fromCharCode(65 + row.length - 1);
    const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(
      `${sheetName}!A${rowNumber}:${lastCol}${rowNumber}`
    )}?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    });
    if (!res.ok) throw new Error(`Sheets update failed: ${res.status}`);
  }

  async findRowNumberById(sheetName: string, id: string): Promise<number | null> {
    const rows = await this.getValues(sheetName);
    const idx = rows.findIndex((r) => r[0] === id);
    return idx === -1 ? null : idx + 2;
  }
}
```

- [ ] **Step 4: 통과 확인**

```bash
npm test
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/sheets/client.ts src/lib/sheets/client.test.ts
git commit -m "feat: add Sheets API client for reading, appending, and updating rows"
```

---

### Task 7: 구글 로그인 훅 (수동 브라우저 검증)

GIS(Google Identity Services)는 `window.google` 전역 객체와 실제 구글 서버를 필요로 하므로, jsdom에서 의미 있게 목(mock) 처리하기 어렵다. 이 태스크는 자동 테스트 대신 **브라우저에서 직접 로그인해보는 수동 검증**으로 마무리한다. (토큰 만료 판단 로직 자체는 이미 Task 4의 `isTokenExpired`로 테스트되어 있다.)

**Files:**
- Create: `src/hooks/useGoogleAuth.ts`
- Modify: `index.html` (GIS 스크립트 태그 추가)

**Interfaces:**
- Consumes: `isTokenExpired` (Task 4)
- Produces: `useGoogleAuth(clientId): { signIn(): void; getValidToken(): string | null; isSignedIn: boolean }` — Task 9~14의 컨테이너가 이 훅으로 토큰을 얻어 `SheetsClient`를 생성한다.

- [ ] **Step 1: `index.html`에 GIS 스크립트 추가**

`<head>` 안에 다음을 추가한다:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

- [ ] **Step 2: 구현 — `src/hooks/useGoogleAuth.ts`**

```ts
import { useCallback, useRef, useState } from "react";
import { isTokenExpired } from "../lib/tokenExpiry";

interface TokenState {
  accessToken: string | null;
  expiresAtMs: number | null;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token: string; expires_in: number }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export function useGoogleAuth(clientId: string) {
  const [token, setToken] = useState<TokenState>({ accessToken: null, expiresAtMs: null });
  const tokenClientRef = useRef<{ requestAccessToken: () => void } | null>(null);

  const ensureTokenClient = useCallback(() => {
    if (!tokenClientRef.current && window.google) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (resp) => {
          setToken({ accessToken: resp.access_token, expiresAtMs: Date.now() + resp.expires_in * 1000 });
        },
      });
    }
    return tokenClientRef.current;
  }, [clientId]);

  const signIn = useCallback(() => {
    ensureTokenClient()?.requestAccessToken();
  }, [ensureTokenClient]);

  const getValidToken = useCallback((): string | null => {
    if (!token.accessToken || !token.expiresAtMs) return null;
    if (isTokenExpired(token.expiresAtMs, Date.now())) return null;
    return token.accessToken;
  }, [token]);

  return { signIn, getValidToken, isSignedIn: getValidToken() !== null };
}
```

- [ ] **Step 3: 수동 검증용 임시 로그인 버튼을 `src/App.tsx`에 추가**

```tsx
import { useGoogleAuth } from "./hooks/useGoogleAuth";

function App() {
  const { signIn, isSignedIn } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  return (
    <div>
      <button onClick={signIn}>구글 로그인</button>
      <p>{isSignedIn ? "로그인됨" : "로그인 안 됨"}</p>
    </div>
  );
}

export default App;
```

- [ ] **Step 4: 수동 검증**

```bash
npm run dev
```
브라우저에서 "구글 로그인" 클릭 → 혜민 또는 민재 계정으로 로그인 → 화면에 "로그인됨"이 뜨는지 확인한다. (Task 2에서 테스트 사용자로 등록한 계정만 로그인 가능해야 정상)

- [ ] **Step 5: 커밋**

```bash
git add index.html src/hooks/useGoogleAuth.ts src/App.tsx
git commit -m "feat: add Google sign-in hook using Identity Services token client"
```

---

### Task 8: 라우터 + 하단 내비게이션

**Files:**
- Create: `src/router.tsx`
- Create: `src/components/BottomNav.tsx`, `src/components/BottomNav.test.tsx`
- Modify: `src/App.tsx`, `src/main.tsx`

**Interfaces:**
- Produces: `<BottomNav />` (여행목록/전체일정/체크리스트 3탭), 라우트 `/`, `/trips/:tripId`, `/trips/:tripId/today`, `/trips/:tripId/checklist` — Task 9~14가 이 라우트에 화면을 붙인다.

- [ ] **Step 1: 실패하는 테스트 — `src/components/BottomNav.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { BottomNav } from "./BottomNav";

describe("BottomNav", () => {
  it("renders all three tab labels", () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText("여행목록")).toBeInTheDocument();
    expect(screen.getByText("전체일정")).toBeInTheDocument();
    expect(screen.getByText("체크리스트")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm test
```
Expected: FAIL — `./BottomNav` 모듈이 없음

- [ ] **Step 3: 구현 — `src/components/BottomNav.tsx`**

```tsx
import { NavLink } from "react-router-dom";

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" className="bottom-nav__item">여행목록</NavLink>
      <NavLink to="/today" className="bottom-nav__item">전체일정</NavLink>
      <NavLink to="/checklist" className="bottom-nav__item">체크리스트</NavLink>
    </nav>
  );
}
```

CSS (`src/styles/global.css`에 추가):

```css
.bottom-nav {
  display: flex;
  justify-content: space-around;
  background: var(--surface);
  border-top: 1px solid var(--line);
  padding: 8px 0;
}
.bottom-nav__item {
  color: var(--ink-muted);
  text-decoration: none;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
}
.bottom-nav__item.active {
  color: var(--surface);
  background: var(--pine);
}
```

- [ ] **Step 4: 통과 확인**

```bash
npm test
```
Expected: PASS

- [ ] **Step 5: `src/router.tsx` 작성**

```tsx
import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import { TripListScreen } from "./screens/TripListScreen";
import { TripOverviewScreen } from "./screens/TripOverviewScreen";
import { TodayScreen } from "./screens/TodayScreen";
import { ChecklistScreen } from "./screens/ChecklistScreen";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <TripListScreen /> },
      { path: "trips/:tripId", element: <TripOverviewScreen /> },
      { path: "trips/:tripId/today", element: <TodayScreen /> },
      { path: "trips/:tripId/checklist", element: <ChecklistScreen /> },
    ],
  },
]);
```

(이 파일은 Task 9~12에서 화면들이 만들어지기 전까지는 컴파일 에러가 난다 — 다음 태스크들에서 해당 파일을 만들면 해결된다. 지금은 4개 화면 파일에 아주 단순한 placeholder를 만들어 라우팅만 동작하는지 확인한다.)

- [ ] **Step 6: 4개 화면에 임시 placeholder 작성**

각 파일에 아래와 같은 형태로 최소 컴포넌트를 만든다 (예: `src/screens/TripListScreen.tsx`):

```tsx
export function TripListScreen() {
  return <p>여행 목록 (구현 예정)</p>;
}
```

`TripOverviewScreen`, `TodayScreen`, `ChecklistScreen`도 동일한 패턴으로 만든다.

- [ ] **Step 7: `src/main.tsx`을 라우터로 교체**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./styles/tokens.css";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
```

- [ ] **Step 8: `src/App.tsx`을 레이아웃 셸로 교체**

```tsx
import { Outlet } from "react-router-dom";
import { BottomNav } from "./components/BottomNav";

function App() {
  return (
    <div className="app-shell">
      <Outlet />
      <BottomNav />
    </div>
  );
}

export default App;
```

- [ ] **Step 9: 개발 서버로 확인**

```bash
npm run dev
```
`/`, `/trips/t1`, `/trips/t1/today`, `/trips/t1/checklist`로 이동하며 각 placeholder 문구와 하단 내비게이션이 보이는지 확인한다.

- [ ] **Step 10: 커밋**

```bash
git add src/router.tsx src/components/BottomNav.tsx src/components/BottomNav.test.tsx src/App.tsx src/main.tsx src/screens
git commit -m "feat: add router shell and bottom navigation"
```

---

### Task 9: 상태 배지 + 구간 커버 카드 + 전체 여정 개요 화면

**Files:**
- Create: `src/components/StatusBadge.tsx`, `src/components/StatusBadge.test.tsx`
- Create: `src/components/SegmentCoverCard.tsx`, `src/components/SegmentCoverCard.test.tsx`
- Modify: `src/screens/TripOverviewScreen.tsx`

**Interfaces:**
- Consumes: `TripStatus` (Task 4), `Segment` (Task 3), `segmentColorKey` (Task 4), `SheetsClient` (Task 6), `useGoogleAuth` (Task 7)
- Produces: `<StatusBadge status={TripStatus} />`, `<SegmentCoverCard segment={Segment} onExpand={() => void} />`

- [ ] **Step 1: 실패하는 테스트 — `src/components/StatusBadge.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="진행중" />);
    expect(screen.getByText("진행중")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인 후 구현 — `src/components/StatusBadge.tsx`**

```tsx
import type { TripStatus } from "../lib/tripStatus";

export function StatusBadge({ status }: { status: TripStatus }) {
  return <span className={`status-badge status-badge--${status}`}>{status}</span>;
}
```

CSS 추가:

```css
.status-badge {
  display: inline-block;
  font-size: 0.64rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--ink-muted);
}
.status-badge--진행중 {
  background: var(--pine);
  color: var(--surface);
}
```

Run `npm test` → PASS 확인.

- [ ] **Step 3: 실패하는 테스트 — `src/components/SegmentCoverCard.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SegmentCoverCard } from "./SegmentCoverCard";

const segment = { segmentId: "s1", tripId: "t1", place: "제주시", order: 1, startDate: "2026-09-01", endDate: "2026-09-02" };

describe("SegmentCoverCard", () => {
  it("renders the place name and date range", () => {
    render(<SegmentCoverCard segment={segment} onExpand={() => {}} />);
    expect(screen.getByText("제주시")).toBeInTheDocument();
    expect(screen.getByText("2026-09-01 ~ 2026-09-02")).toBeInTheDocument();
  });

  it("calls onExpand when the expand button is clicked", async () => {
    const onExpand = vi.fn();
    render(<SegmentCoverCard segment={segment} onExpand={onExpand} />);
    screen.getByRole("button", { name: "펼치기" }).click();
    expect(onExpand).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 4: 실패 확인 후 구현 — `src/components/SegmentCoverCard.tsx`**

```tsx
import type { Segment } from "../types/trip";
import { segmentColorKey } from "../lib/segmentColor";

const GRADIENTS: Record<string, string> = {
  a: "linear-gradient(135deg, var(--seg-a), var(--seg-a2))",
  b: "linear-gradient(135deg, var(--seg-b), var(--seg-b2))",
  c: "linear-gradient(135deg, var(--seg-c), var(--seg-c2))",
};

export function SegmentCoverCard({ segment, onExpand }: { segment: Segment; onExpand: () => void }) {
  const key = segmentColorKey(segment.order);
  return (
    <div className="segment-cover" style={{ background: GRADIENTS[key] }}>
      <div className="segment-cover__panel">
        <p className="segment-cover__place">{segment.place}</p>
        <p className="segment-cover__dates">
          {segment.startDate} ~ {segment.endDate}
        </p>
        <button className="segment-cover__expand" onClick={onExpand} aria-label="펼치기">
          ➔
        </button>
      </div>
    </div>
  );
}
```

CSS 추가:

```css
.segment-cover {
  border-radius: var(--radius-md);
  box-shadow: var(--shadow);
  padding: 24px;
  margin-bottom: 16px;
  position: relative;
}
.segment-cover__panel {
  background: var(--surface);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  color: var(--ink);
}
.segment-cover__place {
  font-weight: 800;
  font-size: 1.0rem;
  margin: 0;
}
.segment-cover__dates {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--ink-muted);
  margin: 4px 0 0;
}
.segment-cover__expand {
  position: absolute;
  right: 12px;
  bottom: -14px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--pine);
  color: var(--surface);
}
```

Run `npm test` → PASS 확인.

- [ ] **Step 5: `TripOverviewScreen` 구현**

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseSegments } from "../lib/sheets/parse";
import type { Segment } from "../types/trip";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { saveItineraryCache, loadItineraryCache } from "../lib/offlineCache";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { SegmentCoverCard } from "../components/SegmentCoverCard";

export function TripOverviewScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const { getValidToken } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const online = useOnlineStatus();
  const [segments, setSegments] = useState<Segment[]>([]);

  useEffect(() => {
    if (!tripId) return;
    const token = getValidToken();
    if (!online || !token) {
      const cached = loadItineraryCache(tripId);
      if (cached) setSegments(cached.segments);
      return;
    }
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    client.getValues("구간").then((rows) => {
      const all = parseSegments(rows);
      const forTrip = all.filter((s) => s.tripId === tripId).sort((a, b) => a.order - b.order);
      setSegments(forTrip);
      saveItineraryCache(tripId, forTrip, loadItineraryCache(tripId)?.items ?? []);
    });
  }, [tripId, online, getValidToken]);

  return (
    <div className="overview-screen">
      {!online && <p className="offline-banner">오프라인입니다 · 마지막으로 불러온 일정을 보여줍니다</p>}
      {segments.map((segment) => (
        <SegmentCoverCard key={segment.segmentId} segment={segment} onExpand={() => {}} />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: 수동 검증**

```bash
npm run dev
```
로그인 후 `/trips/<실제 여행ID>`로 이동해 구간 카드가 색상 순환과 함께 보이는지 확인한다 (구글시트 "구간" 탭에 테스트 데이터를 한 줄 넣어두고 확인).

- [ ] **Step 7: 커밋**

```bash
git add src/components/StatusBadge.tsx src/components/StatusBadge.test.tsx src/components/SegmentCoverCard.tsx src/components/SegmentCoverCard.test.tsx src/screens/TripOverviewScreen.tsx
git commit -m "feat: add status badge, segment cover card, and trip overview screen"
```

---

### Task 10: 여행 목록 화면

**Files:**
- Modify: `src/screens/TripListScreen.tsx`

**Interfaces:**
- Consumes: `Trip` (Task 3), `computeTripStatus` (Task 4), `StatusBadge` (Task 9), `SheetsClient` (Task 6), `useGoogleAuth` (Task 7)

- [ ] **Step 1: 구현 — `src/screens/TripListScreen.tsx`**

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseTrips } from "../lib/sheets/parse";
import { computeTripStatus } from "../lib/tripStatus";
import type { Trip } from "../types/trip";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { StatusBadge } from "../components/StatusBadge";

export function TripListScreen() {
  const { getValidToken, signIn, isSignedIn } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    const token = getValidToken();
    if (!token) return;
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    client.getValues("여행").then((rows) => setTrips(parseTrips(rows)));
  }, [getValidToken]);

  if (!isSignedIn) {
    return (
      <div className="trip-list-screen">
        <button onClick={signIn}>구글 로그인</button>
      </div>
    );
  }

  const today = new Date();
  return (
    <div className="trip-list-screen">
      {trips.map((trip) => (
        <Link key={trip.tripId} to={`/trips/${trip.tripId}`} className="trip-list__item">
          <span>{trip.name}</span>
          <StatusBadge status={computeTripStatus(trip, today)} />
        </Link>
      ))}
    </div>
  );
}
```

CSS 추가:

```css
.trip-list__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--surface);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow);
  padding: 16px;
  margin-bottom: 12px;
  text-decoration: none;
  color: var(--ink);
}
```

- [ ] **Step 2: 수동 검증**

```bash
npm run dev
```
로그인 → 여행 목록에 구글시트 "여행" 탭의 데이터가 상태 배지와 함께 뜨는지 확인한다.

- [ ] **Step 3: 커밋**

```bash
git add src/screens/TripListScreen.tsx
git commit -m "feat: implement trip list screen with sign-in gate and status badges"
```

---

### Task 11: 타임라인 컴포넌트 + 오늘 일정 화면

**Files:**
- Create: `src/components/Timeline.tsx`, `src/components/Timeline.test.tsx`
- Modify: `src/screens/TodayScreen.tsx`

**Interfaces:**
- Consumes: `ItineraryItem` (Task 3), `findCurrentSegment` (Task 4)
- Produces: `<Timeline items={ItineraryItem[]} />` — 시각 표시 없이 order 순서로만 점+선+카드를 그린다. `category === "주차"`인 항목은 항상 골드로 강조한다.

- [ ] **Step 1: 실패하는 테스트 — `src/components/Timeline.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Timeline } from "./Timeline";

const items = [
  { itemId: "i1", segmentId: "s1", placeName: "숙소 A", address: "", transport: "", memo: "", reservationNumber: "", category: "숙소", order: 2 },
  { itemId: "i2", segmentId: "s1", placeName: "공영주차장", address: "", transport: "", memo: "", reservationNumber: "", category: "주차", order: 1 },
];

describe("Timeline", () => {
  it("renders items sorted by order, not by array position", () => {
    render(<Timeline items={items} />);
    const rendered = screen.getAllByTestId("timeline-item").map((el) => el.textContent);
    expect(rendered[0]).toContain("공영주차장");
    expect(rendered[1]).toContain("숙소 A");
  });

  it("marks parking items with the parking modifier class regardless of position", () => {
    render(<Timeline items={items} />);
    const parkingItem = screen.getByText("공영주차장").closest("[data-testid='timeline-item']");
    expect(parkingItem).toHaveClass("timeline-item--parking");
  });
});
```

- [ ] **Step 2: 실패 확인 후 구현 — `src/components/Timeline.tsx`**

```tsx
import type { ItineraryItem } from "../types/trip";

export function Timeline({ items }: { items: ItineraryItem[] }) {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  return (
    <ol className="timeline">
      {sorted.map((item) => {
        const isParking = item.category === "주차";
        return (
          <li
            key={item.itemId}
            data-testid="timeline-item"
            className={`timeline-item${isParking ? " timeline-item--parking" : ""}`}
          >
            <span className="timeline-item__dot" />
            <div className="timeline-item__card">
              <p className="timeline-item__place">{item.placeName}</p>
              {item.memo && <p className="timeline-item__memo">{item.memo}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

CSS 추가:

```css
.timeline { list-style: none; padding: 0; margin: 0; }
.timeline-item { display: flex; gap: 12px; padding: 8px 0; border-left: 2px solid var(--line); margin-left: 6px; }
.timeline-item__dot { width: 10px; height: 10px; border-radius: 50%; background: var(--pine-strong); margin-left: -17px; margin-top: 4px; }
.timeline-item--parking .timeline-item__dot { background: var(--amber); }
.timeline-item--parking .timeline-item__card { background: var(--amber-soft); }
.timeline-item__card { background: var(--surface); border-radius: var(--radius-sm); padding: 10px 14px; flex: 1; }
.timeline-item__place { margin: 0; font-weight: 700; }
.timeline-item__memo { margin: 4px 0 0; font-size: 0.72rem; color: var(--ink-muted); }
```

- [ ] **Step 3: 통과 확인**

```bash
npm test
```
Expected: PASS

- [ ] **Step 4: `TodayScreen` 구현**

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseSegments, parseItineraryItems } from "../lib/sheets/parse";
import { findCurrentSegment } from "../lib/tripStatus";
import type { ItineraryItem, Segment } from "../types/trip";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { loadItineraryCache, saveItineraryCache } from "../lib/offlineCache";
import { Timeline } from "../components/Timeline";

export function TodayScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const { getValidToken } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const online = useOnlineStatus();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [items, setItems] = useState<ItineraryItem[]>([]);

  useEffect(() => {
    if (!tripId) return;
    const token = getValidToken();
    if (!online || !token) {
      const cached = loadItineraryCache(tripId);
      if (cached) {
        setSegments(cached.segments);
        setItems(cached.items);
      }
      return;
    }
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    Promise.all([client.getValues("구간"), client.getValues("일정")]).then(([segRows, itemRows]) => {
      const allSegments = parseSegments(segRows).filter((s) => s.tripId === tripId);
      const allItems = parseItineraryItems(itemRows);
      setSegments(allSegments);
      setItems(allItems);
      saveItineraryCache(tripId, allSegments, allItems);
    });
  }, [tripId, online, getValidToken]);

  const current = findCurrentSegment(segments, new Date());
  const todaysItems = current ? items.filter((i) => i.segmentId === current.segmentId) : [];

  return (
    <div className="today-screen">
      {!online && <p className="offline-banner">오프라인입니다 · 마지막으로 불러온 일정을 보여줍니다</p>}
      {current ? <Timeline items={todaysItems} /> : <p>오늘에 해당하는 구간이 없습니다.</p>}
    </div>
  );
}
```

- [ ] **Step 5: 수동 검증**

```bash
npm run dev
```
구글시트 "구간" 탭의 한 행에 오늘 날짜가 포함되도록 시작일/종료일을 넣고, "일정" 탭에 그 구간ID로 항목을 몇 개 넣어 `/trips/<tripId>/today`에서 순서대로(주차는 골드로) 보이는지 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add src/components/Timeline.tsx src/components/Timeline.test.tsx src/screens/TodayScreen.tsx
git commit -m "feat: add timeline component and today screen"
```

---

### Task 12: 준비물 체크리스트 화면 (오프라인 조회 전용)

**Files:**
- Modify: `src/screens/ChecklistScreen.tsx`
- Test: `src/screens/ChecklistScreen.test.tsx`

**Interfaces:**
- Consumes: `ChecklistItem` (Task 3), `SheetsClient` (Task 6), `useOnlineStatus` (Task 5)
- Produces: 오프라인일 때 체크박스가 비활성화되고 안내 문구가 뜨는 화면.

- [ ] **Step 1: 실패하는 테스트 — `src/screens/ChecklistScreen.test.tsx`**

이 화면은 데이터 로딩(온라인 훅)과 표시 로직이 섞여 있으므로, 오프라인일 때의 순수 렌더링 동작만 테스트 가능한 작은 조각으로 분리해 테스트한다. `ChecklistList` presentational 컴포넌트를 별도로 만든다.

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChecklistList } from "./ChecklistScreen";

const items = [{ checkId: "c1", tripId: "t1", label: "여권", done: false }];

describe("ChecklistList", () => {
  it("renders checkbox as enabled when online", () => {
    render(<ChecklistList items={items} online={true} onToggle={vi.fn()} />);
    expect(screen.getByRole("checkbox")).not.toBeDisabled();
  });

  it("disables the checkbox and shows a message when offline", () => {
    render(<ChecklistList items={items} online={false} onToggle={vi.fn()} />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByText("오프라인입니다 · 체크 변경은 온라인에서")).toBeInTheDocument();
  });

  it("calls onToggle with the item id when checked online", () => {
    const onToggle = vi.fn();
    render(<ChecklistList items={items} online={true} onToggle={onToggle} />);
    screen.getByRole("checkbox").click ? screen.getByRole("checkbox").dispatchEvent(new MouseEvent("click", { bubbles: true })) : null;
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm test
```
Expected: FAIL — `ChecklistList`가 아직 export되지 않음

- [ ] **Step 3: 구현 — `src/screens/ChecklistScreen.tsx`**

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseChecklistItems, checklistItemToRow } from "../lib/sheets/parse";
import type { ChecklistItem } from "../types/trip";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export function ChecklistList({
  items,
  online,
  onToggle,
}: {
  items: ChecklistItem[];
  online: boolean;
  onToggle: (checkId: string, done: boolean) => void;
}) {
  return (
    <div className="checklist-list">
      {!online && <p className="offline-banner">오프라인입니다 · 체크 변경은 온라인에서</p>}
      {items.map((item) => (
        <label key={item.checkId} className="checklist-list__item">
          <input
            type="checkbox"
            checked={item.done}
            disabled={!online}
            onChange={(e) => onToggle(item.checkId, e.target.checked)}
          />
          {item.label}
        </label>
      ))}
    </div>
  );
}

export function ChecklistScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const { getValidToken } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const online = useOnlineStatus();
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    const token = getValidToken();
    if (!online || !token || !tripId) return;
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    client.getValues("체크리스트").then((rows) => {
      setItems(parseChecklistItems(rows).filter((i) => i.tripId === tripId));
    });
  }, [tripId, online, getValidToken]);

  async function handleToggle(checkId: string, done: boolean) {
    const token = getValidToken();
    if (!token) return;
    const updated = items.map((i) => (i.checkId === checkId ? { ...i, done } : i));
    setItems(updated);
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    const rowNumber = await client.findRowNumberById("체크리스트", checkId);
    const target = updated.find((i) => i.checkId === checkId);
    if (rowNumber && target) {
      await client.updateRow("체크리스트", rowNumber, checklistItemToRow(target));
    }
  }

  return <ChecklistList items={items} online={online} onToggle={handleToggle} />;
}
```

CSS 추가:

```css
.checklist-list__item { display: flex; align-items: center; gap: 10px; background: var(--surface); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 8px; }
.offline-banner { background: var(--surface-2); color: var(--ink-muted); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.72rem; margin-bottom: 12px; }
```

- [ ] **Step 4: 통과 확인**

```bash
npm test
```
Expected: PASS

- [ ] **Step 5: 수동 검증**

```bash
npm run dev
```
구글시트 "체크리스트" 탭에 항목을 몇 개 넣고, 온라인일 때 체크가 시트에 반영되는지, 브라우저 개발자도구에서 네트워크를 오프라인으로 바꿨을 때 체크박스가 비활성화되고 안내 문구가 뜨는지 확인한다.

- [ ] **Step 6: 커밋**

```bash
git add src/screens/ChecklistScreen.tsx src/screens/ChecklistScreen.test.tsx
git commit -m "feat: add checklist screen with offline view-only behavior"
```

---

### Task 13: 여행 추가/수정 폼 + 구간 추가/수정 폼

**Files:**
- Create: `src/screens/forms/TripFormScreen.tsx`
- Create: `src/screens/forms/SegmentFormScreen.tsx`
- Modify: `src/router.tsx` (라우트 추가)

**Interfaces:**
- Consumes: `Trip`, `Segment` (Task 3), `SheetsClient` (Task 6), `tripToRow`, `segmentToRow` (Task 3)
- Produces: `/trips/new`, `/trips/:tripId/segments/new` 라우트.

- [ ] **Step 1: 구현 — `src/screens/forms/TripFormScreen.tsx`**

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SheetsClient } from "../../lib/sheets/client";
import { tripToRow } from "../../lib/sheets/parse";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";

export function TripFormScreen() {
  const navigate = useNavigate();
  const { getValidToken } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getValidToken();
    if (!token) return;
    setSaving(true);
    const tripId = crypto.randomUUID();
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    await client.appendRow("여행", tripToRow({ tripId, name, startDate, endDate }));
    setSaving(false);
    navigate(`/trips/${tripId}`);
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <label>
        여행 이름
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        시작일
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
      </label>
      <label>
        종료일
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
      </label>
      <button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
    </form>
  );
}
```

CSS 추가:

```css
.entity-form { display: flex; flex-direction: column; gap: 12px; padding: 16px; }
.entity-form label { display: flex; flex-direction: column; gap: 4px; font-size: 0.8rem; color: var(--ink); }
.entity-form input { padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--surface); color: var(--ink); }
.entity-form button { background: var(--pine); color: var(--surface); border: none; border-radius: var(--radius-sm); padding: 12px; font-weight: 700; }
```

- [ ] **Step 2: 구현 — `src/screens/forms/SegmentFormScreen.tsx`**

```tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SheetsClient } from "../../lib/sheets/client";
import { segmentToRow } from "../../lib/sheets/parse";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";

export function SegmentFormScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { getValidToken } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [place, setPlace] = useState("");
  const [order, setOrder] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getValidToken();
    if (!token || !tripId) return;
    setSaving(true);
    const segmentId = crypto.randomUUID();
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    await client.appendRow("구간", segmentToRow({ segmentId, tripId, place, order, startDate, endDate }));
    setSaving(false);
    navigate(`/trips/${tripId}`);
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <label>
        도시/숙소명
        <input value={place} onChange={(e) => setPlace(e.target.value)} required />
      </label>
      <label>
        순서
        <input type="number" min={1} value={order} onChange={(e) => setOrder(Number(e.target.value))} required />
      </label>
      <label>
        시작일
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
      </label>
      <label>
        종료일
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
      </label>
      <button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
    </form>
  );
}
```

- [ ] **Step 3: `src/router.tsx`에 라우트 추가**

`children` 배열에 추가:

```tsx
{ path: "trips/new", element: <TripFormScreen /> },
{ path: "trips/:tripId/segments/new", element: <SegmentFormScreen /> },
```

해당 import 두 줄도 파일 상단에 추가한다.

- [ ] **Step 4: 수동 검증**

```bash
npm run dev
```
`/trips/new`에서 여행을 하나 만들고, 만들어진 여행 상세에서 `/trips/<id>/segments/new`로 구간을 추가해본 뒤 구글시트에 실제로 행이 추가됐는지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add src/screens/forms/TripFormScreen.tsx src/screens/forms/SegmentFormScreen.tsx src/router.tsx
git commit -m "feat: add trip and segment creation forms"
```

---

### Task 14: 일정 항목 폼 + 체크리스트 항목 폼

**Files:**
- Create: `src/screens/forms/ItineraryItemFormScreen.tsx`
- Create: `src/screens/forms/ChecklistItemFormScreen.tsx`
- Modify: `src/router.tsx` (라우트 추가)

**Interfaces:**
- Consumes: `ItineraryItem`, `ChecklistItem` (Task 3), `SheetsClient` (Task 6), `itineraryItemToRow`, `checklistItemToRow` (Task 3)
- Produces: `/segments/:segmentId/items/new`, `/trips/:tripId/checklist/new` 라우트.

- [ ] **Step 1: 구현 — `src/screens/forms/ItineraryItemFormScreen.tsx`**

```tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SheetsClient } from "../../lib/sheets/client";
import { itineraryItemToRow } from "../../lib/sheets/parse";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";

const CATEGORIES = ["숙소", "식당", "관광", "주차", "이동", "기타"];

export function ItineraryItemFormScreen() {
  const { segmentId } = useParams<{ segmentId: string }>();
  const navigate = useNavigate();
  const { getValidToken } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [placeName, setPlaceName] = useState("");
  const [address, setAddress] = useState("");
  const [transport, setTransport] = useState("");
  const [memo, setMemo] = useState("");
  const [reservationNumber, setReservationNumber] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [order, setOrder] = useState(1);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getValidToken();
    if (!token || !segmentId) return;
    setSaving(true);
    const itemId = crypto.randomUUID();
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    await client.appendRow(
      "일정",
      itineraryItemToRow({ itemId, segmentId, placeName, address, transport, memo, reservationNumber, category, order })
    );
    setSaving(false);
    navigate(-1);
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <label>
        장소명
        <input value={placeName} onChange={(e) => setPlaceName(e.target.value)} required />
      </label>
      <label>
        주소
        <input value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>
      <label>
        이동수단
        <input value={transport} onChange={(e) => setTransport(e.target.value)} />
      </label>
      <label>
        메모
        <input value={memo} onChange={(e) => setMemo(e.target.value)} />
      </label>
      <label>
        예약번호
        <input value={reservationNumber} onChange={(e) => setReservationNumber(e.target.value)} />
      </label>
      <label>
        카테고리
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        순서
        <input type="number" min={1} value={order} onChange={(e) => setOrder(Number(e.target.value))} required />
      </label>
      <button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
    </form>
  );
}
```

- [ ] **Step 2: 구현 — `src/screens/forms/ChecklistItemFormScreen.tsx`**

```tsx
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SheetsClient } from "../../lib/sheets/client";
import { checklistItemToRow } from "../../lib/sheets/parse";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";

export function ChecklistItemFormScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { getValidToken } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getValidToken();
    if (!token || !tripId) return;
    setSaving(true);
    const checkId = crypto.randomUUID();
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    await client.appendRow("체크리스트", checklistItemToRow({ checkId, tripId, label, done: false }));
    setSaving(false);
    navigate(`/trips/${tripId}/checklist`);
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <label>
        준비물 이름
        <input value={label} onChange={(e) => setLabel(e.target.value)} required />
      </label>
      <button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
    </form>
  );
}
```

- [ ] **Step 3: `src/router.tsx`에 라우트 추가**

```tsx
{ path: "segments/:segmentId/items/new", element: <ItineraryItemFormScreen /> },
{ path: "trips/:tripId/checklist/new", element: <ChecklistItemFormScreen /> },
```

- [ ] **Step 4: 수동 검증**

```bash
npm run dev
```
일정 항목과 체크리스트 항목을 각각 추가해보고 구글시트에 반영되는지, "오늘 일정"/"체크리스트" 화면에 바로 나타나는지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add src/screens/forms/ItineraryItemFormScreen.tsx src/screens/forms/ChecklistItemFormScreen.tsx src/router.tsx
git commit -m "feat: add itinerary item and checklist item creation forms"
```

---

### Task 15: PWA 오프라인 앱 셸

**Files:**
- Modify: `vite.config.ts` (Task 1에서 이미 플러그인 추가됨 — workbox 옵션 보강)
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png` (임시 아이콘)

**Interfaces:**
- Consumes: 없음 (독립적인 인프라 태스크)
- Produces: 서비스워커가 앱 셸(JS/CSS)을 프리캐시 — 오프라인에서도 앱이 켜진다.

- [ ] **Step 1: `vite.config.ts`의 `VitePWA` 옵션에 workbox 설정 추가**

`VitePWA({...})` 안에 `workbox` 키를 추가한다:

```ts
VitePWA({
  registerType: "autoUpdate",
  workbox: {
    globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
  },
  manifest: {
    // ...Task 1에서 작성한 manifest 그대로
  },
}),
```

- [ ] **Step 2: 임시 아이콘 준비**

`public/icons/icon-192.png`, `public/icons/icon-512.png`에 단색 배경(예: `--pine` 오렌지) 정사각형 PNG를 넣는다 (나중에 실제 로고로 교체 가능).

- [ ] **Step 3: 빌드 후 서비스워커 생성 확인**

```bash
npm run build
```
`dist/sw.js`와 `dist/manifest.webmanifest`가 생성됐는지 확인한다.

- [ ] **Step 4: 수동 검증**

```bash
npm run preview
```
브라우저에서 접속 후 개발자도구 Application 탭에서 서비스워커가 등록됐는지 확인하고, Network를 오프라인으로 바꾼 뒤 페이지를 새로고침해도 앱 셸(빈 레이아웃)이 뜨는지 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add vite.config.ts public/icons
git commit -m "feat: enable PWA app-shell precaching"
```

---

### Task 16: Vercel 배포

**Files:**
- Create: `vercel.json`

**Interfaces:**
- Consumes: 없음
- Produces: 배포된 프로덕션 URL — Task 2 Step 4에서 이 URL을 OAuth 클라이언트의 승인된 원본에 추가해야 한다.

- [ ] **Step 1: `vercel.json` 작성 (클라이언트 라우팅용 rewrite)**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: 커밋**

```bash
git add vercel.json
git commit -m "chore: add Vercel SPA rewrite config"
```

- [ ] **Step 3: Vercel에 배포 (수동)**

Vercel 대시보드에서 이 저장소를 새 프로젝트로 import 하거나 `vercel` CLI로 배포한다. 환경변수 설정에 `VITE_GOOGLE_CLIENT_ID`, `VITE_SHEET_ID`를 추가한다 (Task 2, Global Constraints 참고).

- [ ] **Step 4: 배포 도메인을 OAuth 클라이언트에 추가**

Task 2에서 만든 OAuth 클라이언트의 "승인된 JavaScript 원본"에 Vercel이 발급한 `https://<프로젝트>.vercel.app` 도메인을 추가한다. 이게 없으면 배포된 사이트에서 로그인이 막힌다.

- [ ] **Step 5: 최종 수동 검증**

배포된 URL에서 로그인 → 여행 목록 → 전체 여정 개요 → 오늘 일정 → 체크리스트 → 폼으로 항목 추가까지 전체 플로우를 혜민/민재 계정으로 한 번씩 확인한다.

---

## Self-Review 결과

- **스펙 커버리지**: 인증(Task 2, 7), 데이터 저장/스키마(Task 3, 6), 데이터 입력 폼(Task 13, 14), 오프라인 지원(Task 5, 9, 11, 12, 15), 4개 화면(Task 9~12), 배포(Task 16) — implementation-design.md의 모든 섹션에 대응하는 태스크가 있다.
- **플레이스홀더 검사**: "TBD"/"나중에" 표현 없음. Task 8의 화면 placeholder는 이후 태스크에서 즉시 실제 구현으로 교체되며 그 사실을 명시함.
- **타입 일관성**: `Trip`/`Segment`/`ItineraryItem`/`ChecklistItem` 필드명이 Task 3에서 정의된 그대로 Task 4, 6, 9~14에서 동일하게 쓰인다. `SheetsClient`의 메서드 시그니처(`getValues`, `appendRow`, `updateRow`, `findRowNumberById`)도 Task 6에서 정의된 그대로 이후 태스크에서 사용된다.
