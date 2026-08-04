import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { SheetsClient } from "../lib/sheets/client";
import { parseChecklistItems, checklistItemToRow } from "../lib/sheets/parse";
import type { ChecklistItem } from "../types/trip";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

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
  const { getValidToken } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const online = useOnlineStatus();
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    const token = getValidToken();
    if (!online || !token || !tripId) return;
    let cancelled = false;
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    client
      .getValues("체크리스트")
      .then((rows) => {
        if (cancelled) return;
        setItems(parseChecklistItems(rows).filter((i) => i.tripId === tripId));
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, online, getValidToken]);

  async function handleToggle(checkId: string, done: boolean) {
    const token = getValidToken();
    if (!token) return;
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
      console.error(err);
      setItems(previous);
    }
  }

  return <ChecklistList items={items} online={online} onToggle={handleToggle} />;
}
