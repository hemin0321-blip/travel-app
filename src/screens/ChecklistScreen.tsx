import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseChecklistItems, checklistItemToRow } from "../lib/sheets/parse";
import type { ChecklistItem } from "../types/trip";
import { useAuth } from "../auth/GoogleAuthContext";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { ErrorBanner } from "../components/ErrorBanner";

type ScreenError = "auth" | "fetch" | "save";

export function ChecklistList({
  items,
  online,
  onToggle,
}: {
  items: ChecklistItem[];
  online: boolean;
  onToggle: (checkId: string, done: boolean) => void;
}) {
  return (
    <div className="checklist-list">
      {!online && <p className="offline-banner">오프라인입니다 · 체크 변경은 온라인에서</p>}
      {items.map((item) => (
        <label key={item.checkId} className="checklist-list__item">
          <input
            type="checkbox"
            checked={item.done}
            disabled={!online}
            onChange={(e) => onToggle(item.checkId, e.target.checked)}
          />
          {item.label}
        </label>
      ))}
    </div>
  );
}

export function ChecklistScreen() {
  const { tripId } = useParams<{ tripId: string }>();
  const { getValidToken, signIn } = useAuth();
  const online = useOnlineStatus();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<ScreenError | null>(null);

  useEffect(() => {
    if (!tripId || !online) return;
    const token = getValidToken();
    if (!token) {
      setError("auth");
      return;
    }
    let cancelled = false;
    setError(null);
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    client
      .getValues("체크리스트")
      .then((rows) => {
        if (cancelled) return;
        setItems(parseChecklistItems(rows).filter((i) => i.tripId === tripId));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Failed to fetch checklist:", err);
        setError("fetch");
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, online, getValidToken]);

  async function handleToggle(checkId: string, done: boolean) {
    const token = getValidToken();
    if (!token) {
      setError("auth");
      return;
    }
    const previous = items;
    const updated = items.map((i) => (i.checkId === checkId ? { ...i, done } : i));
    setItems(updated);
    try {
      const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
      const rowNumber = await client.findRowNumberById("체크리스트", checkId);
      const target = updated.find((i) => i.checkId === checkId);
      if (rowNumber && target) {
        await client.updateRow("체크리스트", rowNumber, checklistItemToRow(target));
      }
    } catch (err) {
      console.error("Failed to update checklist item:", err);
      setItems(previous);
      setError("save");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label || !tripId) return;
    const token = getValidToken();
    if (!token) {
      setError("auth");
      return;
    }
    setAdding(true);
    try {
      const checkId = crypto.randomUUID();
      const item: ChecklistItem = { checkId, tripId, label, done: false };
      const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
      await client.appendRow("체크리스트", checklistItemToRow(item));
      // Same-input-stays-focused pattern (MS To Do style): add to the list and
      // clear the field so the next item can be typed immediately, no navigation.
      setItems((prev) => [...prev, item]);
      setNewLabel("");
    } catch (err) {
      console.error("Failed to add checklist item:", err);
      setError("save");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="checklist-screen">
      {error === "auth" && (
        <ErrorBanner
          message="로그인이 만료됐어요, 다시 로그인 해주세요"
          actionLabel="다시 로그인"
          onAction={signIn}
        />
      )}
      {error === "fetch" && <ErrorBanner message="준비물을 불러오지 못했어요" />}
      {error === "save" && <ErrorBanner message="저장하지 못했어요, 다시 시도해주세요" />}
      <form className="checklist-add" onSubmit={handleAdd}>
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="준비물 추가"
          disabled={!online || adding}
        />
        <button type="submit" disabled={!online || adding || !newLabel.trim()} aria-label="추가">
          +
        </button>
      </form>
      <ChecklistList items={items} online={online} onToggle={handleToggle} />
    </div>
  );
}
