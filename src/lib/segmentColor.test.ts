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
