import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseTrips } from "../lib/sheets/parse";
import { computeTripStatus } from "../lib/tripStatus";
import type { Trip } from "../types/trip";
import { useAuth } from "../auth/GoogleAuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorBanner } from "../components/ErrorBanner";

type ScreenError = "auth" | "fetch";

export function TripListScreen() {
  const { getValidToken, signIn } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<ScreenError | null>(null);

  useEffect(() => {
    const token = getValidToken();
    if (!token) {
      setError("auth");
      return;
    }
    let cancelled = false;
    setError(null);
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    client
      .getValues("여행")
      .then((rows) => {
        if (cancelled) return;
        setTrips(parseTrips(rows));
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch trips:", err);
        setError("fetch");
      });
    return () => {
      cancelled = true;
    };
  }, [getValidToken]);

  const today = new Date();
  return (
    <div className="trip-list-screen">
      {error === "auth" && (
        <ErrorBanner
          message="로그인이 만료됐어요, 다시 로그인 해주세요"
          actionLabel="다시 로그인"
          onAction={signIn}
        />
      )}
      {error === "fetch" && <ErrorBanner message="여행 목록을 불러오지 못했어요" />}
      <Link to="/trips/new" className="add-entity-link">+ 여행 추가</Link>
      {loaded && trips.length === 0 && !error && (
        <p className="trip-list__empty">아직 등록된 여행이 없어요. 위에서 첫 여행을 추가해보세요!</p>
      )}
      {trips.map((trip) => (
        <Link key={trip.tripId} to={`/trips/${trip.tripId}`} className="trip-list__item">
          <span>{trip.name}</span>
          <StatusBadge status={computeTripStatus(trip, today)} />
        </Link>
      ))}
    </div>
  );
}
