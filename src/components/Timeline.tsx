import { useState } from "react";
import type { ItineraryItem } from "../types/trip";

function TimelineItemMenu({ itemId, onDelete }: { itemId: string; onDelete: (itemId: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="timeline-item__menu">
      <button
        type="button"
        className="timeline-item__menu-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-label="더보기"
      >
        ⋯
      </button>
      {open && (
        <button
          type="button"
          className="timeline-item__delete"
          onClick={() => {
            setOpen(false);
            onDelete(itemId);
          }}
        >
          삭제
        </button>
      )}
    </div>
  );
}

export function Timeline({ items, onDelete }: { items: ItineraryItem[]; onDelete?: (itemId: string) => void }) {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  return (
    <ol className="timeline">
      {sorted.map((item) => {
        const isParking = item.category === "주차";
        return (
          <li
            key={item.itemId}
            data-testid="timeline-item"
            className={`timeline-item${isParking ? " timeline-item--parking" : ""}`}
          >
            <span className="timeline-item__dot" />
            <div className="timeline-item__card">
              <p className="timeline-item__place">{item.placeName}</p>
              {item.memo && <p className="timeline-item__memo">{item.memo}</p>}
            </div>
            {onDelete && <TimelineItemMenu itemId={item.itemId} onDelete={onDelete} />}
          </li>
        );
      })}
    </ol>
  );
}
