import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SheetsClient } from "../../lib/sheets/client";
import { segmentToRow } from "../../lib/sheets/parse";
import { useAuth } from "../../auth/GoogleAuthContext";
import { ErrorBanner } from "../../components/ErrorBanner";

export function SegmentFormScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { getValidToken, signIn } = useAuth();
  const [place, setPlace] = useState("");
  const [order, setOrder] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<"auth" | "save" | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getValidToken();
    if (!token) {
      setError("auth");
      return;
    }
    if (!tripId) return;
    try {
      setSaving(true);
      setError(null);
      const segmentId = crypto.randomUUID();
      const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
      await client.appendRow("구간", segmentToRow({ segmentId, tripId, place, order, startDate, endDate }));
      navigate(`/trips/${tripId}`);
    } catch (err) {
      console.error("Failed to save segment:", err);
      setError("save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      {error === "auth" && (
        <ErrorBanner message="로그인이 만료됐어요, 다시 로그인 해주세요" actionLabel="다시 로그인" onAction={signIn} />
      )}
      {error === "save" && <ErrorBanner message="저장하지 못했어요, 다시 시도해주세요" />}
      <label>
        도시/숙소명
        <input value={place} onChange={(e) => setPlace(e.target.value)} required />
      </label>
      <label>
        순서
        <input type="number" min={1} value={order} onChange={(e) => setOrder(Number(e.target.value))} required />
      </label>
      <label>
        시작일
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          required
        />
      </label>
      <label>
        종료일
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          required
        />
      </label>
      <button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
    </form>
  );
}
