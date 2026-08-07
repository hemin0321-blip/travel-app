import { useEffect, useState } from "react";
import { SheetsClient } from "../lib/sheets/client";
import { parseRentalCars, rentalCarToRow } from "../lib/sheets/parse";
import { useAuth } from "../auth/GoogleAuthContext";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { ErrorBanner } from "./ErrorBanner";

/**
 * A trip has at most one rental car record, so this is a small always-editable
 * inline form (not a list) — keyed by tripId itself in the sheet rather than
 * a separate id, and living in its own "렌터카" tab that gets created on first
 * save if it doesn't exist yet.
 */
export function RentalCarSection({ tripId }: { tripId: string | undefined }) {
  const { getValidToken } = useAuth();
  const online = useOnlineStatus();
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [location, setLocation] = useState("");
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setPickupDate("");
    setReturnDate("");
    setLocation("");
    setCompany("");
    if (!tripId) return;
    const token = getValidToken();
    if (!token) return;
    let cancelled = false;
    const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
    client
      .getValues("렌터카")
      .then((rows) => {
        if (cancelled) return;
        const car = parseRentalCars(rows).find((c) => c.tripId === tripId);
        if (car) {
          setPickupDate(car.pickupDate);
          setReturnDate(car.returnDate);
          setLocation(car.location);
          setCompany(car.company);
        }
      })
      .catch((err) => {
        // The "렌터카" tab may not exist yet on a trip that has never saved
        // one — that's a normal empty state, not worth surfacing as an error.
        console.error("Failed to fetch rental car info:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId, getValidToken]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tripId) return;
    const token = getValidToken();
    if (!token) return;
    setSaving(true);
    setError(false);
    try {
      const client = new SheetsClient(import.meta.env.VITE_SHEET_ID, () => token);
      await client.ensureSheetExists("렌터카");
      const rowNumber = await client.findRowNumberById("렌터카", tripId);
      const row = rentalCarToRow({ tripId, pickupDate, returnDate, location, company });
      if (rowNumber) {
        await client.updateRow("렌터카", rowNumber, row);
      } else {
        await client.appendRow("렌터카", row);
      }
    } catch (err) {
      console.error("Failed to save rental car info:", err);
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  const disabled = saving || !online;

  return (
    <form className="rental-car" onSubmit={handleSave}>
      <p className="rental-car__title">렌트카</p>
      {error && <ErrorBanner message="저장하지 못했어요, 다시 시도해주세요" />}
      <div className="rental-car__row">
        <input
          type="date"
          value={pickupDate}
          onChange={(e) => setPickupDate(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          disabled={disabled}
          aria-label="대여일"
        />
        <span>~</span>
        <input
          type="date"
          value={returnDate}
          onChange={(e) => setReturnDate(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          disabled={disabled}
          aria-label="반납일"
        />
      </div>
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="대여 장소"
        disabled={disabled}
      />
      <input
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        placeholder="렌터카 회사"
        disabled={disabled}
      />
      <button
        type="submit"
        disabled={disabled || !pickupDate || !returnDate || !location.trim() || !company.trim()}
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
