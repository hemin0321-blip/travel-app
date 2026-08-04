import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { BottomNav } from "./BottomNav";

describe("BottomNav", () => {
  it("renders all three tab labels", () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText("여행목록")).toBeInTheDocument();
    expect(screen.getByText("전체일정")).toBeInTheDocument();
    expect(screen.getByText("체크리스트")).toBeInTheDocument();
  });

  it("links 전체일정/체크리스트 to / when there is no tripId in the route", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.getByText("전체일정")).toHaveAttribute("href", "/");
    expect(screen.getByText("체크리스트")).toHaveAttribute("href", "/");
  });

  it("links 전체일정/체크리스트 to the current trip's routes when tripId is present", () => {
    render(
      <MemoryRouter initialEntries={["/trips/abc123"]}>
        <Routes>
          <Route path="/trips/:tripId" element={<BottomNav />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("전체일정")).toHaveAttribute("href", "/trips/abc123/today");
    expect(screen.getByText("체크리스트")).toHaveAttribute("href", "/trips/abc123/checklist");
  });
});
