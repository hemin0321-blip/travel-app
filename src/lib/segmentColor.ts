export type SegmentColorKey = "a" | "b" | "c";

const KEYS: SegmentColorKey[] = ["a", "b", "c"];

export function segmentColorKey(order: number): SegmentColorKey {
  const idx = ((order - 1) % 3 + 3) % 3;
  return KEYS[idx];
}
