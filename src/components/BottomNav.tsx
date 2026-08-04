import { NavLink, useParams } from "react-router-dom";

export function BottomNav() {
  const { tripId } = useParams<{ tripId?: string }>();
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
