import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SheetsClient } from "../../lib/sheets/client";
import { itineraryItemToRow } from "../../lib/sheets/parse";
import { useAuth } from "../../auth/GoogleAuthContext";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { ErrorBanner } from "../../components/ErrorBanner";

const CATEGORIES = ["숙소", "식당", "관광", "주차", "이동", "기타"];

export function ItineraryItemFormScreen() {
  const { segmentId } = useParams<{ segmentId: string }>();
  const navigate = useNavigate();
  const { getValidToken, signIn } = useAuth();
  const online = useOnlineStatus();
  const [placeName, setPlaceName] = useState("");
  const [address, setAddress] = useState("");
  const [transport, setTransport] = useState("");
  const [memo, setMemo] = useState("");
  const [reservationNumber, setReservationNumber] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [order, setOrder] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<"auth" | "save" | null>(null);

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
      const itemId = crypto.randomUUID();
      const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
      await client.appendRow(
        "일정",
        itineraryItemToRow({ itemId, segmentId, placeName, address, transport, memo, reservationNumber, category, order })
      );
      navigate(-1);
    } catch (err) {
      console.error("Failed to save itinerary item:", err);
      setError("save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      {!online && <p className="offline-banner">오프라인입니다 · 온라인에서 저장할 수 있어요</p>}
      {error === "auth" && (
        <ErrorBanner message="로그인이 만료됐어요, 다시 로그인 해주세요" actionLabel="다시 로그인" onAction={signIn} />
      )}
      {error === "save" && <ErrorBanner message="저장하지 못했어요, 다시 시도해주세요" />}
      <label>
        장소명
        <input value={placeName} onChange={(e) => setPlaceName(e.target.value)} required />
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
      <label>
        순서
        <input type="number" min={1} value={order} onChange={(e) => setOrder(Number(e.target.value))} required />
      </label>
      <button type="submit" disabled={saving || !online}>{saving ? "저장 중..." : "저장"}</button>
    </form>
  );
}
