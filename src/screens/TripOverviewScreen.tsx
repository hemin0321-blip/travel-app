import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseSegments } from "../lib/sheets/parse";
import type { Segment } from "../types/trip";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { saveItineraryCache, loadItineraryCache } from "../lib/offlineCache";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { SegmentCoverCard } from "../components/SegmentCoverCard";

export function TripOverviewScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const { getValidToken } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const online = useOnlineStatus();
  const [segments, setSegments] = useState<Segment[]>([]);

  useEffect(() => {
    if (!tripId) return;
    const token = getValidToken();
    if (!online || !token) {
      const cached = loadItineraryCache(tripId);
      if (cached) setSegments(cached.segments);
      return;
    }
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    client.getValues("구간").then((rows) => {
      const all = parseSegments(rows);
      const forTrip = all.filter((s) => s.tripId === tripId).sort((a, b) => a.order - b.order);
      setSegments(forTrip);
      saveItineraryCache(tripId, forTrip, loadItineraryCache(tripId)?.items ?? []);
    });
  }, [tripId, online, getValidToken]);

  return (
    <div className="overview-screen">
      {!online && <p className="offline-banner">오프라인입니다 · 마지막으로 불러온 일정을 보여줍니다</p>}
      {segments.map((segment) => (
        <SegmentCoverCard key={segment.segmentId} segment={segment} onExpand={() => {}} />
      ))}
    </div>
  );
}
