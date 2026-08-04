import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SegmentCoverCard } from "./SegmentCoverCard";

const segment = { segmentId: "s1", tripId: "t1", place: "제주시", order: 1, startDate: "2026-09-01", endDate: "2026-09-02" };

describe("SegmentCoverCard", () => {
  it("renders the place name and date range", () => {
    render(<SegmentCoverCard segment={segment} onExpand={() => {}} />);
    expect(screen.getByText("제주시")).toBeInTheDocument();
    expect(screen.getByText("2026-09-01 ~ 2026-09-02")).toBeInTheDocument();
  });

  it("calls onExpand when the expand button is clicked", async () => {
    const onExpand = vi.fn();
    render(<SegmentCoverCard segment={segment} onExpand={onExpand} />);
    screen.getByRole("button", { name: "펼치기" }).click();
    expect(onExpand).toHaveBeenCalledOnce();
  });
});
