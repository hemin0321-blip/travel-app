const CURRENT_TRIP_KEY = "travel-app:current-trip-id";

/**
 * The trip the user is "in" right now — set once when they pick a trip (from
 * the list, or by landing on any of its screens directly), read by the root
 * redirect and the bottom nav so re-opening the app goes straight back to
 * that trip instead of the picker every time.
 */
export function getCurrentTripId(): string | null {
  try {
    return localStorage.getItem(CURRENT_TRIP_KEY);
  } catch (err) {
    console.error("Failed to read current trip id:", err);
    return null;
  }
}

export function setCurrentTripId(tripId: string): void {
  try {
    localStorage.setItem(CURRENT_TRIP_KEY, tripId);
  } catch (err) {
    console.error("Failed to persist current trip id:", err);
  }
}
