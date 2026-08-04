import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SheetsClient } from "../../lib/sheets/client";
import { tripToRow } from "../../lib/sheets/parse";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";

export function TripFormScreen() {
  const navigate = useNavigate();
  const { getValidToken } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getValidToken();
    if (!token) return;
    try {
      setSaving(true);
      const tripId = crypto.randomUUID();
      const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
      await client.appendRow("여행", tripToRow({ tripId, name, startDate, endDate }));
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
        여행 이름
        <input value={name} onChange={(e) => setName(e.target.value)} required />
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
