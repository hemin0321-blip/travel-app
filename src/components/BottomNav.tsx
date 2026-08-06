import { NavLink, useMatch } from "react-router-dom";
import { getCurrentTripId } from "../lib/currentTrip";

export function BottomNav() {
  // BottomNav is rendered by the top-level layout route, so useParams() would
  // always be empty here. useMatch matches the current URL directly, which works
  // from any render context. Falling back to the persisted current trip means
  // these tabs keep working even from the trip picker ("/trips") itself.
  const matchedTripId = useMatch("/trips/:tripId/*")?.params.tripId;
  const tripId = matchedTripId ?? getCurrentTripId() ?? undefined;
  const overviewHref = tripId ? `/trips/${tripId}` : "/trips";
  const todayHref = tripId ? `/trips/${tripId}/today` : "/trips";
  const checklistHref = tripId ? `/trips/${tripId}/checklist` : "/trips";

  return (
    <nav className="bottom-nav">
      <NavLink to={overviewHref} className="bottom-nav__item" end>
        전체일정
      </NavLink>
      <NavLink to={todayHref} className="bottom-nav__item">
        오늘일정
      </NavLink>
      <NavLink to={checklistHref} className="bottom-nav__item">
        체크리스트
      </NavLink>
    </nav>
  );
}
