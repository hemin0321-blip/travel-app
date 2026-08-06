import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SheetsClient } from "../../lib/sheets/client";
import { checklistItemToRow } from "../../lib/sheets/parse";
import { useAuth } from "../../auth/GoogleAuthContext";
import { ErrorBanner } from "../../components/ErrorBanner";

export function ChecklistItemFormScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { getValidToken, signIn } = useAuth();
  const [label, setLabel] = useState("");
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
      const checkId = crypto.randomUUID();
      const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
      await client.appendRow("체크리스트", checklistItemToRow({ checkId, tripId, label, done: false }));
      navigate(`/trips/${tripId}/checklist`);
    } catch (err) {
      console.error("Failed to save checklist item:", err);
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
        준비물 이름
        <input value={label} onChange={(e) => setLabel(e.target.value)} required />
      </label>
      <button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
    </form>
  );
}
