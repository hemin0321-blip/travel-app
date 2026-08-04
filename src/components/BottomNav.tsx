import { NavLink } from "react-router-dom";

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/" className="bottom-nav__item">여행목록</NavLink>
      <NavLink to="/today" className="bottom-nav__item">전체일정</NavLink>
      <NavLink to="/checklist" className="bottom-nav__item">체크리스트</NavLink>
    </nav>
  );
}
