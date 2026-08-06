import { Link } from "react-router-dom";
import { useTripName } from "../hooks/useTripName";

/** Slim bar shown at the top of every trip-scoped screen so switching trips
 * is a deliberate tap, not something that happens by landing on "/". */
export function TripHeader({ tripId }: { tripId: string | undefined }) {
  const name = useTripName(tripId);
  return (
    <div className="trip-header">
      <span className="trip-header__name">{name ?? "여행"}</span>
      <Link to="/trips" className="trip-header__switch">
        다른 여행 선택
      </Link>
    </div>
  );
}
