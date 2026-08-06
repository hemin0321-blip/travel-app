import { NavLink, useMatch } from "react-router-dom";

export function BottomNav() {
  // BottomNav is rendered by the top-level layout route, so useParams() would
  // always be empty here. useMatch matches the current URL directly, which works
  // from any render context.
  const matchedTripId = useMatch("/trips/:tripId/*")?.params.tripId;
  // "/trips/new" is the trip creation form, not a trip id.
  const tripId = matchedTripId && matchedTripId !== "new" ? matchedTripId : undefined;
  const todayHref = tripId ? `/trips/${tripId}/today` : "/";
  const checklistHref = tripId ? `/trips/${tripId}/checklist` : "/";

  return (
    <nav className="bottom-nav">
      <NavLink to="/" className="bottom-nav__item">여행목록</NavLink>
      <NavLink to={todayHref} className="bottom-nav__item">전체일정</NavLink>
      <NavLink to={checklistHref} className="bottom-nav__item">체크리스트</NavLink>
    </nav>
  );
}
