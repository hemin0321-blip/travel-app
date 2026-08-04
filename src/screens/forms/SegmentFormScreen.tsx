import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SheetsClient } from "../../lib/sheets/client";
import { segmentToRow } from "../../lib/sheets/parse";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";

export function SegmentFormScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { getValidToken } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [place, setPlace] = useState("");
  const [order, setOrder] = useState(1);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getValidToken();
    if (!token || !tripId) return;
    try {
      setSaving(true);
      const segmentId = crypto.randomUUID();
      const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
      await client.appendRow("구간", segmentToRow({ segmentId, tripId, place, order, startDate, endDate }));
      navigate(`/trips/${tripId}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
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
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
      </label>
      <label>
        종료일
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
      </label>
      <button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
    </form>
  );
}
