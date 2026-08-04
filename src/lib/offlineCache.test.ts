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
