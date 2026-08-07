import { describe, expect, it } from "vitest";
import { computeTripStatus, findCurrentSegment, findNextSegment } from "./tripStatus";

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

describe("findNextSegment", () => {
  const segments = [
    { segmentId: "s1", tripId: "t1", place: "제주시", order: 1, startDate: "2026-09-01", endDate: "2026-09-02" },
    { segmentId: "s2", tripId: "t1", place: "서귀포", order: 2, startDate: "2026-09-03", endDate: "2026-09-04" },
  ];

  it("returns the earliest segment that starts after today", () => {
    expect(findNextSegment(segments, new Date("2026-08-01"))?.segmentId).toBe("s1");
  });

  it("skips segments that already started, returning the next one", () => {
    expect(findNextSegment(segments, new Date("2026-09-01"))?.segmentId).toBe("s2");
  });

  it("returns undefined when no segment starts after today", () => {
    expect(findNextSegment(segments, new Date("2026-12-25"))).toBeUndefined();
  });
});
