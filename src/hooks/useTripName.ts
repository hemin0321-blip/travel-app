import { useEffect, useState } from "react";
import { SheetsClient } from "../lib/sheets/client";
import { parseTrips } from "../lib/sheets/parse";
import { useAuth } from "../auth/GoogleAuthContext";

/** Looks up a trip's display name for the header — null while loading or unavailable. */
export function useTripName(tripId: string | undefined): string | null {
  const { getValidToken } = useAuth();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    setName(null);
    if (!tripId) return;
    const token = getValidToken();
    if (!token) return;
    let cancelled = false;
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    client
      .getValues("여행")
      .then((rows) => {
        if (cancelled) return;
        const trip = parseTrips(rows).find((t) => t.tripId === tripId);
        if (trip) setName(trip.name);
      })
      .catch((err) => {
        console.error("Failed to fetch trip name:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, getValidToken]);

  return name;
}
