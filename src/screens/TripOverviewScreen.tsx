import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseSegments, segmentToRow, parseItineraryItems } from "../lib/sheets/parse";
import type { ItineraryItem, Segment } from "../types/trip";
import { useAuth } from "../auth/GoogleAuthContext";
import { saveItineraryCache, loadItineraryCache } from "../lib/offlineCache";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { setCurrentTripId } from "../lib/currentTrip";
import { SegmentCoverCard } from "../components/SegmentCoverCard";
import { Timeline } from "../components/Timeline";
import { ErrorBanner } from "../components/ErrorBanner";
import { TripHeader } from "../components/TripHeader";
import { RentalCarSection } from "../components/RentalCarSection";

type ScreenError = "auth" | "fetch" | "save";

export function TripOverviewScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const { getValidToken, signIn } = useAuth();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newPlace, setNewPlace] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<ScreenError | null>(null);

  // Only one city's detail can be open at a time — clicking a city expands
  // its itinerary in place (M365 accordion style) instead of navigating to a
  // separate screen, since that's the far more common thing to look at.
  const [expandedSegmentId, setExpandedSegmentId] = useState<string | null>(null);
  const [segmentEditing, setSegmentEditing] = useState(false);
  const [editPlace, setEditPlace] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [savingSegment, setSavingSegment] = useState(false);

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
      if (cached) {
        setSegments(cached.segments);
        setItems(cached.items);
      }
      // Offline is already communicated by the offline banner; a missing token
      // while online means the session expired.
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
        setSegments(tripSegments);
        setItems(tripItems);
        setLoaded(true);
        saveItineraryCache(tripId, tripSegments, tripItems);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch segments:", err);
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

  function toggleExpand(segmentId: string) {
    setSegmentEditing(false);
    setExpandedSegmentId((current) => (current === segmentId ? null : segmentId));
  }

  function startEditingSegment(segment: Segment) {
    setEditPlace(segment.place);
    setEditStart(segment.startDate);
    setEditEnd(segment.endDate);
    setSegmentEditing(true);
  }

  async function handleSaveSegment(e: React.FormEvent) {
    e.preventDefault();
    if (!expandedSegmentId) return;
    const token = getValidToken();
    if (!token) {
      setError("auth");
      return;
    }
    setSavingSegment(true);
    setError(null);
    try {
      const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
      const rowNumber = await client.findRowNumberById("구간", expandedSegmentId);
      if (rowNumber) {
        const current = segments.find((s) => s.segmentId === expandedSegmentId);
        if (current) {
          const updated: Segment = { ...current, place: editPlace, startDate: editStart, endDate: editEnd };
          await client.updateRow("구간", rowNumber, segmentToRow(updated));
          setSegments((prev) => prev.map((s) => (s.segmentId === expandedSegmentId ? updated : s)));
        }
      }
      setSegmentEditing(false);
    } catch (err) {
      console.error("Failed to update segment:", err);
      setError("save");
    } finally {
      setSavingSegment(false);
    }
  }

  function handleEditItem(itemId: string) {
    navigate(`/segments/${expandedSegmentId}/items/${itemId}/edit`);
  }

  async function handleDeleteItem(itemId: string) {
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
        await client.updateRow("일정", rowNumber, ["", "", "", "", "", "", "", "", "", ""]);
      }
    } catch (err) {
      console.error("Failed to delete itinerary item:", err);
      setItems(previous);
      setError("save");
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
      <RentalCarSection tripId={tripId} />
      <form className="trip-add" onSubmit={handleAdd}>
        <input
          value={newPlace}
          onChange={(e) => setNewPlace(e.target.value)}
          placeholder="도시/숙소 추가"
          disabled={adding || !online}
        />
        <div className="trip-add__row">
          <input
            type="date"
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            onClick={(e) => e.currentTarget.showPicker?.()}
            disabled={adding || !online}
          />
          <span>~</span>
          <input
            type="date"
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            onClick={(e) => e.currentTarget.showPicker?.()}
            disabled={adding || !online}
          />
          <button
            type="submit"
            disabled={adding || !online || !newPlace.trim() || !newStart || !newEnd}
            aria-label="추가"
          >
            +
          </button>
        </div>
      </form>
      {loaded && segments.length === 0 && !error && (
        <p className="trip-list__empty">아직 등록된 구간이 없어요. 위에서 첫 구간을 추가해보세요!</p>
      )}
      {segments.map((segment) => {
        const expanded = expandedSegmentId === segment.segmentId;
        return (
          <div key={segment.segmentId}>
            <SegmentCoverCard
              segment={segment}
              expanded={expanded}
              onExpand={() => toggleExpand(segment.segmentId)}
            />
            {expanded && (
              <div className="segment-panel">
                {!segmentEditing && (
                  <button
                    type="button"
                    className="segment-panel__edit-toggle"
                    disabled={!online}
                    onClick={() => startEditingSegment(segment)}
                  >
                    구간 정보 수정
                  </button>
                )}
                {segmentEditing && (
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
                    <div className="segment-panel__actions">
                      <button
                        type="button"
                        className="segment-panel__cancel"
                        onClick={() => setSegmentEditing(false)}
                        disabled={savingSegment}
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={savingSegment || !editPlace.trim() || !editStart || !editEnd}
                      >
                        {savingSegment ? "저장 중..." : "저장"}
                      </button>
                    </div>
                  </form>
                )}
                {loaded && items.filter((i) => i.segmentId === segment.segmentId).length === 0 && (
                  <p className="trip-list__empty">아직 등록된 일정이 없어요. 아래에서 첫 일정을 추가해보세요!</p>
                )}
                <Timeline
                  items={items.filter((i) => i.segmentId === segment.segmentId)}
                  onEdit={online ? handleEditItem : undefined}
                  onDelete={online ? handleDeleteItem : undefined}
                />
                <button
                  type="button"
                  className="segment-detail__add"
                  disabled={!online}
                  onClick={() => navigate(`/segments/${segment.segmentId}/items/new`)}
                >
                  + 일정 추가
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
