import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BottomNav } from "./BottomNav";

/**
 * Mirrors how App.tsx really renders BottomNav: once, inside the top-level
 * layout route, next to the <Outlet /> that renders the matched child screen.
 */
function Layout() {
  return (
    <div className="app-shell">
      <Outlet />
      <BottomNav />
    </div>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="trips" element={<p>여행 목록</p>} />
          <Route path="trips/:tripId" element={<p>전체 여정</p>} />
          <Route path="trips/:tripId/today" element={<p>오늘</p>} />
          <Route path="trips/:tripId/checklist" element={<p>체크리스트 화면</p>} />
          <Route path="segments/:segmentId/items/new" element={<p>일정 추가</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("BottomNav", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders all three tab labels", () => {
    renderAt("/trips/abc123");
    expect(screen.getByText("전체일정")).toBeInTheDocument();
    expect(screen.getByText("오늘일정")).toBeInTheDocument();
    expect(screen.getByText("체크리스트")).toBeInTheDocument();
  });

  it("links all three tabs to the current trip from the overview route", () => {
    renderAt("/trips/abc123");
    expect(screen.getByText("전체일정")).toHaveAttribute("href", "/trips/abc123");
    expect(screen.getByText("오늘일정")).toHaveAttribute("href", "/trips/abc123/today");
    expect(screen.getByText("체크리스트")).toHaveAttribute("href", "/trips/abc123/checklist");
  });

  it("links to the current trip from a nested route under the trip", () => {
    renderAt("/trips/abc123/today");
    expect(screen.getByText("전체일정")).toHaveAttribute("href", "/trips/abc123");
    expect(screen.getByText("오늘일정")).toHaveAttribute("href", "/trips/abc123/today");
    expect(screen.getByText("체크리스트")).toHaveAttribute("href", "/trips/abc123/checklist");
  });

  it("links to the current trip from the checklist route", () => {
    renderAt("/trips/abc123/checklist");
    expect(screen.getByText("전체일정")).toHaveAttribute("href", "/trips/abc123");
    expect(screen.getByText("오늘일정")).toHaveAttribute("href", "/trips/abc123/today");
  });

  it("falls back to the persisted current trip when the URL carries no trip id (the picker)", () => {
    localStorage.setItem("travel-app:current-trip-id", "last-viewed");
    renderAt("/trips");
    expect(screen.getByText("전체일정")).toHaveAttribute("href", "/trips/last-viewed");
    expect(screen.getByText("오늘일정")).toHaveAttribute("href", "/trips/last-viewed/today");
    expect(screen.getByText("체크리스트")).toHaveAttribute("href", "/trips/last-viewed/checklist");
  });

  it("falls back to the trip picker when no trip has ever been selected", () => {
    renderAt("/trips");
    expect(screen.getByText("전체일정")).toHaveAttribute("href", "/trips");
    expect(screen.getByText("오늘일정")).toHaveAttribute("href", "/trips");
    expect(screen.getByText("체크리스트")).toHaveAttribute("href", "/trips");
  });

  it("falls back to the trip picker on routes that carry no trip id and none was ever selected", () => {
    renderAt("/segments/seg1/items/new");
    expect(screen.getByText("전체일정")).toHaveAttribute("href", "/trips");
    expect(screen.getByText("체크리스트")).toHaveAttribute("href", "/trips");
  });
});
