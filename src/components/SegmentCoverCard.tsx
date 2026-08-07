import type { Segment } from "../types/trip";
import { segmentColorKey } from "../lib/segmentColor";

const GRADIENTS: Record<string, string> = {
  a: "linear-gradient(135deg, var(--seg-a), var(--seg-a2))",
  b: "linear-gradient(135deg, var(--seg-b), var(--seg-b2))",
  c: "linear-gradient(135deg, var(--seg-c), var(--seg-c2))",
};

export function SegmentCoverCard({
  segment,
  expanded = false,
  onExpand,
}: {
  segment: Segment;
  expanded?: boolean;
  onExpand: () => void;
}) {
  const key = segmentColorKey(segment.order);
  return (
    <div className="segment-cover" style={{ background: GRADIENTS[key] }}>
      <div className="segment-cover__panel">
        <p className="segment-cover__place">{segment.place}</p>
        <p className="segment-cover__dates">
          {segment.startDate} ~ {segment.endDate}
        </p>
        <button className="segment-cover__expand" onClick={onExpand} aria-label="펼치기">
          {expanded ? "▼" : "➔"}
        </button>
      </div>
    </div>
  );
}
