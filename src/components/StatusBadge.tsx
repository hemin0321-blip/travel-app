import type { TripStatus } from "../lib/tripStatus";

export function StatusBadge({ status }: { status: TripStatus }) {
  return <span className={`status-badge status-badge--${status}`}>{status}</span>;
}
