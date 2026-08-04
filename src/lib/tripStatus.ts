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
