import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseTrips, tripToRow } from "../lib/sheets/parse";
import { computeTripStatus } from "../lib/tripStatus";
import type { Trip } from "../types/trip";
import { useAuth } from "../auth/GoogleAuthContext";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorBanner } from "../components/ErrorBanner";
import { hardReset } from "../lib/hardReset";
import { setCurrentTripId } from "../lib/currentTrip";

type ScreenError = "auth" | "fetch" | "save";

export function TripListScreen() {
  const { getValidToken, signIn } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [adding, setAdding] = useState(false);
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || !newStart || !newEnd) return;
    const token = getValidToken();
    if (!token) {
      setError("auth");
      return;
    }
    setAdding(true);
    try {
      const trip: Trip = { tripId: crypto.randomUUID(), name, startDate: newStart, endDate: newEnd };
      const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
      await client.appendRow("여행", tripToRow(trip));
      setTrips((prev) => [...prev, trip]);
      setNewName("");
      setNewStart("");
      setNewEnd("");
    } catch (err) {
      console.error("Failed to add trip:", err);
      setError("save");
    } finally {
      setAdding(false);
    }
  }

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
      {error === "save" && <ErrorBanner message="저장하지 못했어요, 다시 시도해주세요" />}
      <form className="trip-add" onSubmit={handleAdd}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="여행 이름 추가"
          disabled={adding}
        />
        <div className="trip-add__row">
          <input
            type="date"
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            onClick={(e) => e.currentTarget.showPicker?.()}
            disabled={adding}
          />
          <span>~</span>
          <input
            type="date"
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            onClick={(e) => e.currentTarget.showPicker?.()}
            disabled={adding}
          />
          <button
            type="submit"
            disabled={adding || !newName.trim() || !newStart || !newEnd}
            aria-label="추가"
          >
            +
          </button>
        </div>
      </form>
      {loaded && trips.length === 0 && !error && (
        <p className="trip-list__empty">아직 등록된 여행이 없어요. 위에서 첫 여행을 추가해보세요!</p>
      )}
      {trips.map((trip) => (
        <Link
          key={trip.tripId}
          to={`/trips/${trip.tripId}`}
          className="trip-list__item"
          onClick={() => setCurrentTripId(trip.tripId)}
        >
          <span>{trip.name}</span>
          <StatusBadge status={computeTripStatus(trip, today)} />
        </Link>
      ))}
      <button type="button" className="hard-reset-link" onClick={() => void hardReset()}>
        화면이 이상하거나 오래된 것 같으면 여기를 눌러 새로고침
      </button>
    </div>
  );
}
