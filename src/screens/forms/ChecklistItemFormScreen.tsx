import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SheetsClient } from "../../lib/sheets/client";
import { checklistItemToRow } from "../../lib/sheets/parse";
import { useGoogleAuth } from "../../hooks/useGoogleAuth";

export function ChecklistItemFormScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { getValidToken } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getValidToken();
    if (!token || !tripId) return;
    try {
      setSaving(true);
      const checkId = crypto.randomUUID();
      const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
      await client.appendRow("체크리스트", checklistItemToRow({ checkId, tripId, label, done: false }));
      navigate(`/trips/${tripId}/checklist`);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="entity-form" onSubmit={handleSubmit}>
      <label>
        준비물 이름
        <input value={label} onChange={(e) => setLabel(e.target.value)} required />
      </label>
      <button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
    </form>
  );
}
