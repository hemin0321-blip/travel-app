import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseSegments, parseItineraryItems } from "../lib/sheets/parse";
import { findCurrentSegment, findNextSegment } from "../lib/tripStatus";
import type { ItineraryItem, Segment } from "../types/trip";
import { useAuth } from "../auth/GoogleAuthContext";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { loadItineraryCache, saveItineraryCache } from "../lib/offlineCache";
import { setCurrentTripId } from "../lib/currentTrip";
import { Timeline } from "../components/Timeline";
import { ErrorBanner } from "../components/ErrorBanner";
import { TripHeader } from "../components/TripHeader";

type ScreenError = "auth" | "fetch";

export function TodayScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const { getValidToken, signIn } = useAuth();
  const online = useOnlineStatus();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [error, setError] = useState<ScreenError | null>(null);

  useEffect(() => {
    if (tripId) setCurrentTripId(tripId);
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    const token = getValidToken();
    if (!online || !token) {
      const cached = loadItineraryCache(tripId);
      if (cached) {
        setSegments(cached.segments);
        setItems(cached.items);
      }
      setError(online && !token ? "auth" : null);
      return;
    }
    let cancelled = false;
    setError(null);
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    Promise.all([client.getValues("구간"), client.getValues("일정")])
      .then(([segRows, itemRows]) => {
        if (cancelled) return;
        // Same shape as TripOverviewScreen writes: this trip's segments sorted by
        // order, and only the items belonging to those segments — otherwise each
        // trip's cache would hold the whole sheet's items.
        const tripSegments = parseSegments(segRows)
          .filter((s) => s.tripId === tripId)
          .sort((a, b) => a.order - b.order);
        const segmentIds = new Set(tripSegments.map((s) => s.segmentId));
        const tripItems = parseItineraryItems(itemRows).filter((i) => segmentIds.has(i.segmentId));
        setSegments(tripSegments);
        setItems(tripItems);
        saveItineraryCache(tripId, tripSegments, tripItems);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch itinerary:", err);
        const cached = loadItineraryCache(tripId);
        if (cached) {
          setSegments(cached.segments);
          setItems(cached.items);
        } else {
          setError("fetch");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, online, getValidToken]);

  const today = new Date();
  const current = findCurrentSegment(segments, today);
  const next = current ? undefined : findNextSegment(segments, today);
  const todaysItems = current ? items.filter((i) => i.segmentId === current.segmentId) : [];

  return (
    <div className="today-screen">
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
      {current && <Timeline items={todaysItems} />}
      {!current && next && (
        <p className="trip-list__empty">
          오늘은 일정이 없어요. 다음 일정은{" "}
          <Link to={`/trips/${tripId}/segments/${next.segmentId}`}>
            {next.place} ({next.startDate}~)
          </Link>
          {" "}이에요.
        </p>
      )}
      {!current && !next && <p className="trip-list__empty">오늘에 해당하는 구간이 없습니다.</p>}
    </div>
  );
}
