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
      // `|| 0` (not `?? 0`) so a non-numeric cell degrades to 0 instead of NaN,
      // which would break sorting and the segment color lookup.
      order: Number(r[3]) || 0,
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
      order: Number(r[8]) || 0,
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
