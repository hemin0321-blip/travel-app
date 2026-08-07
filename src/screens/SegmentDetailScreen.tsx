import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseSegments, parseItineraryItems, segmentToRow } from "../lib/sheets/parse";
import type { ItineraryItem, Segment } from "../types/trip";
import { useAuth } from "../auth/GoogleAuthContext";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { loadItineraryCache, saveItineraryCache } from "../lib/offlineCache";
import { setCurrentTripId } from "../lib/currentTrip";
import { Timeline } from "../components/Timeline";
import { ErrorBanner } from "../components/ErrorBanner";
import { TripHeader } from "../components/TripHeader";

type ScreenError = "auth" | "fetch" | "save";

export function SegmentDetailScreen() {
  const { tripId, segmentId } = useParams<{ tripId: string; segmentId: string }>();
  const { getValidToken, signIn } = useAuth();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [segment, setSegment] = useState<Segment | null>(null);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<ScreenError | null>(null);
  const [editingSegment, setEditingSegment] = useState(false);
  const [editPlace, setEditPlace] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [savingSegment, setSavingSegment] = useState(false);

  useEffect(() => {
    if (tripId) setCurrentTripId(tripId);
  }, [tripId]);

  useEffect(() => {
    if (!tripId || !segmentId) return;
    const token = getValidToken();
    if (!online || !token) {
      const cached = loadItineraryCache(tripId);
      if (cached) {
        setSegment(cached.segments.find((s) => s.segmentId === segmentId) ?? null);
        setItems(cached.items.filter((i) => i.segmentId === segmentId));
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
        const tripSegments = parseSegments(segRows)
          .filter((s) => s.tripId === tripId)
          .sort((a, b) => a.order - b.order);
        const tripItems = parseItineraryItems(itemRows).filter((i) =>
          tripSegments.some((s) => s.segmentId === i.segmentId)
        );
        setSegment(tripSegments.find((s) => s.segmentId === segmentId) ?? null);
        setItems(tripItems.filter((i) => i.segmentId === segmentId));
        setLoaded(true);
        saveItineraryCache(tripId, tripSegments, tripItems);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch segment detail:", err);
        const cached = loadItineraryCache(tripId);
        if (cached) {
          setSegment(cached.segments.find((s) => s.segmentId === segmentId) ?? null);
          setItems(cached.items.filter((i) => i.segmentId === segmentId));
        } else {
          setError("fetch");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, segmentId, online, getValidToken]);

  function handleEditItem(itemId: string) {
    navigate(`/segments/${segmentId}/items/${itemId}/edit`);
  }

  function startEditingSegment() {
    if (!segment) return;
    setEditPlace(segment.place);
    setEditStart(segment.startDate);
    setEditEnd(segment.endDate);
    setEditingSegment(true);
  }

  async function handleSaveSegment(e: React.FormEvent) {
    e.preventDefault();
    if (!segment || !tripId || !segmentId) return;
    const token = getValidToken();
    if (!token) {
      setError("auth");
      return;
    }
    setSavingSegment(true);
    setError(null);
    try {
      const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
      const rowNumber = await client.findRowNumberById("구간", segmentId);
      if (rowNumber) {
        const updated: Segment = { ...segment, place: editPlace, startDate: editStart, endDate: editEnd };
        await client.updateRow("구간", rowNumber, segmentToRow(updated));
        setSegment(updated);
      }
      setEditingSegment(false);
    } catch (err) {
      console.error("Failed to update segment:", err);
      setError("save");
    } finally {
      setSavingSegment(false);
    }
  }

  async function handleDelete(itemId: string) {
    const token = getValidToken();
    if (!token) {
      setError("auth");
      return;
    }
    const previous = items;
    setItems(items.filter((i) => i.itemId !== itemId));
    try {
      const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
      const rowNumber = await client.findRowNumberById("일정", itemId);
      // Blanking the row (rather than a true row deletion) is enough: parseItineraryItems
      // already filters out rows with no id, so a blanked row just disappears next fetch.
      if (rowNumber) {
        await client.updateRow("일정", rowNumber, ["", "", "", "", "", "", "", "", ""]);
      }
    } catch (err) {
      console.error("Failed to delete itinerary item:", err);
      setItems(previous);
      setError("save");
    }
  }

  return (
    <div className="segment-detail-screen">
      <TripHeader tripId={tripId} />
      <div className="segment-detail__header">
        <Link to={`/trips/${tripId}`} className="segment-detail__back">
          ← 전체일정
        </Link>
        {segment && !editingSegment && (
          <div className="segment-detail__summary">
            <div>
              <p className="segment-detail__place">{segment.place}</p>
              <p className="segment-detail__dates">
                {segment.startDate} ~ {segment.endDate}
              </p>
            </div>
            <button
              type="button"
              className="segment-detail__edit-toggle"
              disabled={!online}
              onClick={startEditingSegment}
            >
              수정
            </button>
          </div>
        )}
        {segment && editingSegment && (
          <form className="trip-add" onSubmit={handleSaveSegment}>
            <input
              value={editPlace}
              onChange={(e) => setEditPlace(e.target.value)}
              placeholder="도시/숙소"
              disabled={savingSegment}
            />
            <div className="trip-add__row">
              <input
                type="date"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                disabled={savingSegment}
              />
              <span>~</span>
              <input
                type="date"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                disabled={savingSegment}
              />
            </div>
            <div className="segment-detail__actions">
              <button
                type="button"
                className="segment-detail__cancel"
                onClick={() => setEditingSegment(false)}
                disabled={savingSegment}
              >
                취소
              </button>
              <button type="submit" disabled={savingSegment || !editPlace.trim() || !editStart || !editEnd}>
                {savingSegment ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        )}
      </div>
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
      {loaded && items.length === 0 && !error && (
        <p className="trip-list__empty">아직 등록된 일정이 없어요. 아래에서 첫 일정을 추가해보세요!</p>
      )}
      <Timeline
        items={items}
        onEdit={online ? handleEditItem : undefined}
        onDelete={online ? handleDelete : undefined}
      />
      <button
        type="button"
        className="segment-detail__add"
        disabled={!online}
        onClick={() => navigate(`/segments/${segmentId}/items/new`)}
      >
        + 일정 추가
      </button>
    </div>
  );
}
