import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseSegments, parseItineraryItems } from "../lib/sheets/parse";
import { findCurrentSegment } from "../lib/tripStatus";
import type { ItineraryItem, Segment } from "../types/trip";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { loadItineraryCache, saveItineraryCache } from "../lib/offlineCache";
import { Timeline } from "../components/Timeline";

export function TodayScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const { getValidToken } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const online = useOnlineStatus();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [items, setItems] = useState<ItineraryItem[]>([]);

  useEffect(() => {
    if (!tripId) return;
    const token = getValidToken();
    if (!online || !token) {
      const cached = loadItineraryCache(tripId);
      if (cached) {
        setSegments(cached.segments);
        setItems(cached.items);
      }
      return;
    }
    let cancelled = false;
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    Promise.all([client.getValues("구간"), client.getValues("일정")])
      .then(([segRows, itemRows]) => {
        if (cancelled) return;
        const allSegments = parseSegments(segRows).filter((s) => s.tripId === tripId);
        const allItems = parseItineraryItems(itemRows);
        setSegments(allSegments);
        setItems(allItems);
        saveItineraryCache(tripId, allSegments, allItems);
      })
      .catch(() => {
        if (cancelled) return;
        const cached = loadItineraryCache(tripId);
        if (cached) {
          setSegments(cached.segments);
          setItems(cached.items);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, online, getValidToken]);

  const current = findCurrentSegment(segments, new Date());
  const todaysItems = current ? items.filter((i) => i.segmentId === current.segmentId) : [];

  return (
    <div className="today-screen">
      {!online && <p className="offline-banner">오프라인입니다 · 마지막으로 불러온 일정을 보여줍니다</p>}
      {current ? <Timeline items={todaysItems} /> : <p>오늘에 해당하는 구간이 없습니다.</p>}
    </div>
  );
}
