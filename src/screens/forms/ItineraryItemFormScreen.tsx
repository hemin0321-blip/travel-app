import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SheetsClient } from "../../lib/sheets/client";
import { itineraryItemToRow, parseItineraryItems } from "../../lib/sheets/parse";
import { useAuth } from "../../auth/GoogleAuthContext";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { ErrorBanner } from "../../components/ErrorBanner";

const CATEGORIES = ["숙소", "식당", "관광", "주차", "이동", "기타"];

/** Also used for editing — presence of :itemId in the URL is the only difference. */
export function ItineraryItemFormScreen() {
  const { segmentId, itemId } = useParams<{ segmentId: string; itemId?: string }>();
  const isEdit = Boolean(itemId);
  const navigate = useNavigate();
  const { getValidToken, signIn } = useAuth();
  const online = useOnlineStatus();
  const [placeName, setPlaceName] = useState("");
  const [time, setTime] = useState("");
  const [address, setAddress] = useState("");
  const [transport, setTransport] = useState("");
  const [memo, setMemo] = useState("");
  const [reservationNumber, setReservationNumber] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [order, setOrder] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!isEdit);
  const [error, setError] = useState<"auth" | "save" | "fetch" | null>(null);

  useEffect(() => {
    if (!isEdit) return;
    const token = getValidToken();
    if (!token) {
      setError("auth");
      return;
    }
    let cancelled = false;
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    client
      .getValues("일정")
      .then((rows) => {
        if (cancelled) return;
        const item = parseItineraryItems(rows).find((i) => i.itemId === itemId);
        if (!item) {
          setError("fetch");
          return;
        }
        setPlaceName(item.placeName);
        setTime(item.time);
        setAddress(item.address);
        setTransport(item.transport);
        setMemo(item.memo);
        setReservationNumber(item.reservationNumber);
        setCategory(item.category || CATEGORIES[0]);
        setOrder(item.order);
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch itinerary item:", err);
        setError("fetch");
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, itemId, getValidToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getValidToken();
    if (!token) {
      setError("auth");
      return;
    }
    if (!segmentId) return;
    try {
      setSaving(true);
      setError(null);
      const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
      if (isEdit && itemId) {
        const rowNumber = await client.findRowNumberById("일정", itemId);
        if (rowNumber) {
          await client.updateRow(
            "일정",
            rowNumber,
            itineraryItemToRow({
              itemId,
              segmentId,
              placeName,
              time,
              address,
              transport,
              memo,
              reservationNumber,
              category,
              order: order ?? 1,
            })
          );
        }
      } else {
        // Order isn't something a user should have to think about — append to
        // the end of this segment's existing items, same as the trip/segment
        // add forms already do with their own "order" field.
        const existingRows = await client.getValues("일정");
        const existingCount = parseItineraryItems(existingRows).filter((i) => i.segmentId === segmentId).length;
        await client.appendRow(
          "일정",
          itineraryItemToRow({
            itemId: crypto.randomUUID(),
            segmentId,
            placeName,
            time,
            address,
            transport,
            memo,
            reservationNumber,
            category,
            order: existingCount + 1,
          })
        );
      }
      navigate(-1);
    } catch (err) {
      console.error("Failed to save itinerary item:", err);
      setError("save");
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && !loaded && !error) {
    return <p className="entity-form__loading">불러오는 중...</p>;
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      {!online && <p className="offline-banner">오프라인입니다 · 온라인에서 저장할 수 있어요</p>}
      {error === "auth" && (
        <ErrorBanner message="로그인이 만료됐어요, 다시 로그인 해주세요" actionLabel="다시 로그인" onAction={signIn} />
      )}
      {error === "save" && <ErrorBanner message="저장하지 못했어요, 다시 시도해주세요" />}
      {error === "fetch" && <ErrorBanner message="불러오지 못했어요" />}
      <label>
        장소명
        <input value={placeName} onChange={(e) => setPlaceName(e.target.value)} required />
      </label>
      <label>
        시간
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
        />
      </label>
      <label>
        주소
        <input value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>
      <label>
        이동수단
        <input value={transport} onChange={(e) => setTransport(e.target.value)} />
      </label>
      <label>
        메모
        <input value={memo} onChange={(e) => setMemo(e.target.value)} />
      </label>
      <label>
        예약번호
        <input value={reservationNumber} onChange={(e) => setReservationNumber(e.target.value)} />
      </label>
      <label>
        카테고리
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={saving || !online}>{saving ? "저장 중..." : "저장"}</button>
    </form>
  );
}
