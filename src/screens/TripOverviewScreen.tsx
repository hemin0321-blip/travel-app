import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseSegments, segmentToRow } from "../lib/sheets/parse";
import type { Segment } from "../types/trip";
import { useAuth } from "../auth/GoogleAuthContext";
import { saveItineraryCache, loadItineraryCache } from "../lib/offlineCache";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { setCurrentTripId } from "../lib/currentTrip";
import { SegmentCoverCard } from "../components/SegmentCoverCard";
import { ErrorBanner } from "../components/ErrorBanner";
import { TripHeader } from "../components/TripHeader";

type ScreenError = "auth" | "fetch" | "save";

export function TripOverviewScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const { getValidToken, signIn } = useAuth();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newPlace, setNewPlace] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<ScreenError | null>(null);

  // Landing directly on a trip's URL (a deep link, a reload, or coming back
  // from a nested screen) should "select" it too, not just clicking it in
  // the picker — otherwise the bottom nav could fall back to a stale trip.
  useEffect(() => {
    if (tripId) setCurrentTripId(tripId);
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    const token = getValidToken();
    if (!online || !token) {
      const cached = loadItineraryCache(tripId);
      if (cached) setSegments(cached.segments);
      // Offline is already communicated by the offline banner; a missing token
      // while online means the session expired.
      setError(online && !token ? "auth" : null);
      return;
    }
    let cancelled = false;
    setError(null);
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    client
      .getValues("구간")
      .then((rows) => {
        if (cancelled) return;
        const all = parseSegments(rows);
        const forTrip = all.filter((s) => s.tripId === tripId).sort((a, b) => a.order - b.order);
        setSegments(forTrip);
        setLoaded(true);
        saveItineraryCache(tripId, forTrip, loadItineraryCache(tripId)?.items ?? []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch segments:", err);
        const cached = loadItineraryCache(tripId);
        if (cached) setSegments(cached.segments);
        else setError("fetch");
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, online, getValidToken]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const place = newPlace.trim();
    if (!place || !newStart || !newEnd || !tripId) return;
    const token = getValidToken();
    if (!token) {
      setError("auth");
      return;
    }
    setAdding(true);
    try {
      const segment: Segment = {
        segmentId: crypto.randomUUID(),
        tripId,
        place,
        // One less thing to type: a new segment always goes at the end.
        order: segments.length + 1,
        startDate: newStart,
        endDate: newEnd,
      };
      const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
      await client.appendRow("구간", segmentToRow(segment));
      setSegments((prev) => [...prev, segment]);
      setNewPlace("");
      setNewStart("");
      setNewEnd("");
    } catch (err) {
      console.error("Failed to add segment:", err);
      setError("save");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="overview-screen">
      <TripHeader tripId={tripId} />
      {!online && <p className="offline-banner">오프라인입니다 · 마지막으로 불러온 일정을 보여줍니다</p>}
      {error === "auth" && (
        <ErrorBanner
          message="로그인이 만료됐어요, 다시 로그인 해주세요"
          actionLabel="다시 로그인"
          onAction={signIn}
        />
      )}
      {error === "fetch" && <ErrorBanner message="일정을 불러오지 못했어요" />}
      {error === "save" && <ErrorBanner message="저장하지 못했어요, 다시 시도해주세요" />}
      <form className="trip-add" onSubmit={handleAdd}>
        <input
          value={newPlace}
          onChange={(e) => setNewPlace(e.target.value)}
          placeholder="도시/숙소 추가"
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
            disabled={adding || !newPlace.trim() || !newStart || !newEnd}
            aria-label="추가"
          >
            +
          </button>
        </div>
      </form>
      {loaded && segments.length === 0 && !error && (
        <p className="trip-list__empty">아직 등록된 구간이 없어요. 위에서 첫 구간을 추가해보세요!</p>
      )}
      {segments.map((segment) => (
        <SegmentCoverCard
          key={segment.segmentId}
          segment={segment}
          onExpand={() => navigate(`/trips/${tripId}/segments/${segment.segmentId}`)}
        />
      ))}
    </div>
  );
}
