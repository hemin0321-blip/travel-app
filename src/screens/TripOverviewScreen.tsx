import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseSegments } from "../lib/sheets/parse";
import type { Segment } from "../types/trip";
import { useAuth } from "../auth/GoogleAuthContext";
import { saveItineraryCache, loadItineraryCache } from "../lib/offlineCache";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { SegmentCoverCard } from "../components/SegmentCoverCard";
import { ErrorBanner } from "../components/ErrorBanner";

type ScreenError = "auth" | "fetch";

export function TripOverviewScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const { getValidToken, signIn } = useAuth();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [error, setError] = useState<ScreenError | null>(null);

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

  return (
    <div className="overview-screen">
      {!online && <p className="offline-banner">오프라인입니다 · 마지막으로 불러온 일정을 보여줍니다</p>}
      {error === "auth" && (
        <ErrorBanner
          message="로그인이 만료됐어요, 다시 로그인 해주세요"
          actionLabel="다시 로그인"
          onAction={signIn}
        />
      )}
      {error === "fetch" && <ErrorBanner message="일정을 불러오지 못했어요" />}
      <Link to={`/trips/${tripId}/segments/new`} className="add-entity-link">+ 구간 추가</Link>
      {segments.map((segment) => (
        <SegmentCoverCard
          key={segment.segmentId}
          segment={segment}
          onExpand={() => navigate(`/segments/${segment.segmentId}/items/new`)}
        />
      ))}
    </div>
  );
}
