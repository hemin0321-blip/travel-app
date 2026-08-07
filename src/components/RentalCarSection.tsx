import { useEffect, useState } from "react";
import { SheetsClient } from "../lib/sheets/client";
import { parseRentalCars, rentalCarToRow } from "../lib/sheets/parse";
import { useAuth } from "../auth/GoogleAuthContext";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { ErrorBanner } from "./ErrorBanner";

const HEADER = ["tripId", "pickupDate", "returnDate", "location", "company", "pickupTime", "returnTime"];

/**
 * A trip has at most one rental car record, so this isn't a list — it shows
 * as a compact summary once saved (like every other screen's data), with a
 * "수정" toggle to bring back the edit form, and only stays open by default
 * when there's nothing saved yet (matching the trip/segment add forms).
 */
export function RentalCarSection({ tripId }: { tripId: string | undefined }) {
  const { getValidToken } = useAuth();
  const online = useOnlineStatus();
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [location, setLocation] = useState("");
  const [company, setCompany] = useState("");
  const [hasRecord, setHasRecord] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setPickupDate("");
    setPickupTime("");
    setReturnDate("");
    setReturnTime("");
    setLocation("");
    setCompany("");
    setHasRecord(false);
    setEditing(false);
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
          setPickupTime(car.pickupTime);
          setReturnDate(car.returnDate);
          setReturnTime(car.returnTime);
          setLocation(car.location);
          setCompany(car.company);
          setHasRecord(true);
        } else {
          // Nothing saved yet — show the form right away instead of an empty summary.
          setEditing(true);
        }
      })
      .catch((err) => {
        // The "렌터카" tab may not exist yet on a trip that has never saved
        // one — that's a normal empty state, not worth surfacing as an error.
        console.error("Failed to fetch rental car info:", err);
        setEditing(true);
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
      await client.ensureSheetExists("렌터카", HEADER);
      const rowNumber = await client.findRowNumberById("렌터카", tripId);
      const row = rentalCarToRow({ tripId, pickupDate, returnDate, location, company, pickupTime, returnTime });
      if (rowNumber) {
        await client.updateRow("렌터카", rowNumber, row);
      } else {
        await client.appendRow("렌터카", row);
      }
      setHasRecord(true);
      setEditing(false);
    } catch (err) {
      console.error("Failed to save rental car info:", err);
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="rental-car">
        <div className="rental-car__summary">
          <div>
            <p className="rental-car__title">렌트카</p>
            <p className="rental-car__summary-line">
              {pickupDate} {pickupTime} ~ {returnDate} {returnTime}
            </p>
            <p className="rental-car__summary-line">{location} · {company}</p>
          </div>
          <button type="button" className="rental-car__edit-toggle" onClick={() => setEditing(true)}>
            수정
          </button>
        </div>
      </div>
    );
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
        <input
          type="time"
          value={pickupTime}
          onChange={(e) => setPickupTime(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          disabled={disabled}
          aria-label="대여 시간"
        />
      </div>
      <div className="rental-car__row">
        <input
          type="date"
          value={returnDate}
          onChange={(e) => setReturnDate(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          disabled={disabled}
          aria-label="반납일"
        />
        <input
          type="time"
          value={returnTime}
          onChange={(e) => setReturnTime(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          disabled={disabled}
          aria-label="반납 시간"
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
      <div className="rental-car__actions">
        {hasRecord && (
          <button
            type="button"
            className="rental-car__cancel"
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={disabled || !pickupDate || !returnDate || !location.trim() || !company.trim()}
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
