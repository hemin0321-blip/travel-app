import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
});
