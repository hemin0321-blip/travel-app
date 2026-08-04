import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseTrips } from "../lib/sheets/parse";
import { computeTripStatus } from "../lib/tripStatus";
import type { Trip } from "../types/trip";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { StatusBadge } from "../components/StatusBadge";

export function TripListScreen() {
  const { getValidToken, signIn, isSignedIn } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    const token = getValidToken();
    if (!token) return;
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    client.getValues("여행").then((rows) => setTrips(parseTrips(rows)));
  }, [getValidToken]);

  if (!isSignedIn) {
    return (
      <div className="trip-list-screen">
        <button onClick={signIn}>구글 로그인</button>
      </div>
    );
  }

  const today = new Date();
  return (
    <div className="trip-list-screen">
      {trips.map((trip) => (
        <Link key={trip.tripId} to={`/trips/${trip.tripId}`} className="trip-list__item">
          <span>{trip.name}</span>
          <StatusBadge status={computeTripStatus(trip, today)} />
        </Link>
      ))}
    </div>
  );
}
