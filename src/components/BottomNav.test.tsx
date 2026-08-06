import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
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
          <Route index element={<p>여행 목록</p>} />
          <Route path="trips/:tripId" element={<p>전체 여정</p>} />
          <Route path="trips/:tripId/today" element={<p>오늘</p>} />
          <Route path="trips/:tripId/checklist" element={<p>체크리스트 화면</p>} />
          <Route path="trips/new" element={<p>여행 추가</p>} />
          <Route path="segments/:segmentId/items/new" element={<p>일정 추가</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("BottomNav", () => {
  it("renders all three tab labels", () => {
    renderAt("/");
    expect(screen.getByText("여행목록")).toBeInTheDocument();
    expect(screen.getByText("전체일정")).toBeInTheDocument();
    expect(screen.getByText("체크리스트")).toBeInTheDocument();
  });

  it("links 전체일정/체크리스트 to / on the trip list route", () => {
    renderAt("/");
    expect(screen.getByText("전체일정")).toHaveAttribute("href", "/");
    expect(screen.getByText("체크리스트")).toHaveAttribute("href", "/");
  });

  it("links to the current trip from the trip overview route", () => {
    renderAt("/trips/abc123");
    expect(screen.getByText("전체일정")).toHaveAttribute("href", "/trips/abc123/today");
    expect(screen.getByText("체크리스트")).toHaveAttribute("href", "/trips/abc123/checklist");
  });

  it("links to the current trip from a nested route under the trip", () => {
    renderAt("/trips/abc123/today");
    expect(screen.getByText("전체일정")).toHaveAttribute("href", "/trips/abc123/today");
    expect(screen.getByText("체크리스트")).toHaveAttribute("href", "/trips/abc123/checklist");
  });

  it("links to the current trip from the checklist route", () => {
    renderAt("/trips/abc123/checklist");
    expect(screen.getByText("전체일정")).toHaveAttribute("href", "/trips/abc123/today");
    expect(screen.getByText("체크리스트")).toHaveAttribute("href", "/trips/abc123/checklist");
  });

  it("does not treat /trips/new as a trip id", () => {
    renderAt("/trips/new");
    expect(screen.getByText("전체일정")).toHaveAttribute("href", "/");
    expect(screen.getByText("체크리스트")).toHaveAttribute("href", "/");
  });

  it("falls back to / on routes that carry no trip id", () => {
    renderAt("/segments/seg1/items/new");
    expect(screen.getByText("전체일정")).toHaveAttribute("href", "/");
    expect(screen.getByText("체크리스트")).toHaveAttribute("href", "/");
  });
});
