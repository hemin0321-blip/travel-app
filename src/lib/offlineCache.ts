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
  try {
    localStorage.setItem(KEY_PREFIX + tripId, JSON.stringify(payload));
  } catch (err) {
    // Quota exceeded or storage disabled — the app still works online.
    console.error("Failed to save itinerary cache:", err);
  }
}

export function loadItineraryCache(tripId: string): CachedItinerary | null {
  const raw = localStorage.getItem(KEY_PREFIX + tripId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedItinerary;
  } catch (err) {
    // Corrupted entry: degrade to "no cache" rather than throwing on the
    // offline path, where recovery is hardest.
    console.error("Failed to read itinerary cache:", err);
    return null;
  }
}
