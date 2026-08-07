import { useState } from "react";
import type { ItineraryItem } from "../types/trip";

function TimelineItemMenu({
  itemId,
  onEdit,
  onDelete,
}: {
  itemId: string;
  onEdit?: (itemId: string) => void;
  onDelete?: (itemId: string) => void;
}) {
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
        <div className="timeline-item__menu-panel">
          {onEdit && (
            <button
              type="button"
              className="timeline-item__edit"
              onClick={() => {
                setOpen(false);
                onEdit(itemId);
              }}
            >
              수정
            </button>
          )}
          {onDelete && (
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
      )}
    </div>
  );
}

export function Timeline({
  items,
  onEdit,
  onDelete,
}: {
  items: ItineraryItem[];
  onEdit?: (itemId: string) => void;
  onDelete?: (itemId: string) => void;
}) {
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
              <p className="timeline-item__place">
                {item.time && <span className="timeline-item__time">{item.time}</span>}
                {item.placeName}
              </p>
              {item.address && <p className="timeline-item__detail">{item.address}</p>}
              {item.transport && <p className="timeline-item__detail">이동수단: {item.transport}</p>}
              {item.memo && <p className="timeline-item__memo">{item.memo}</p>}
              {item.reservationNumber && (
                <p className="timeline-item__detail">예약번호: {item.reservationNumber}</p>
              )}
            </div>
            {(onEdit || onDelete) && (
              <TimelineItemMenu itemId={item.itemId} onEdit={onEdit} onDelete={onDelete} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
