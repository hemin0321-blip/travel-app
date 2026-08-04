import type { ItineraryItem } from "../types/trip";

export function Timeline({ items }: { items: ItineraryItem[] }) {
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
          </li>
        );
      })}
    </ol>
  );
}
