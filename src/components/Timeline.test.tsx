import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Timeline } from "./Timeline";

const items = [
  { itemId: "i1", segmentId: "s1", placeName: "숙소 A", address: "", transport: "", memo: "", reservationNumber: "", category: "숙소", order: 2, time: "" },
  { itemId: "i2", segmentId: "s1", placeName: "공영주차장", address: "", transport: "", memo: "", reservationNumber: "", category: "주차", order: 1, time: "" },
];

describe("Timeline", () => {
  it("renders items sorted by order, not by array position", () => {
    render(<Timeline items={items} />);
    const rendered = screen.getAllByTestId("timeline-item").map((el) => el.textContent);
    expect(rendered[0]).toContain("공영주차장");
    expect(rendered[1]).toContain("숙소 A");
  });

  it("marks parking items with the parking modifier class regardless of position", () => {
    render(<Timeline items={items} />);
    const parkingItem = screen.getByText("공영주차장").closest("[data-testid='timeline-item']");
    expect(parkingItem).toHaveClass("timeline-item--parking");
  });

  it("renders time, address, transport, and reservation number when present", () => {
    const detailed = [
      {
        itemId: "i3",
        segmentId: "s1",
        placeName: "숙소 B",
        address: "제주시 어딘가",
        transport: "렌터카",
        memo: "체크인 3시",
        reservationNumber: "R123",
        category: "숙소",
        order: 1,
        time: "15:00",
      },
    ];
    render(<Timeline items={detailed} />);
    expect(screen.getByText("15:00")).toBeInTheDocument();
    expect(screen.getByText("제주시 어딘가")).toBeInTheDocument();
    expect(screen.getByText("이동수단: 렌터카")).toBeInTheDocument();
    expect(screen.getByText("체크인 3시")).toBeInTheDocument();
    expect(screen.getByText("예약번호: R123")).toBeInTheDocument();
  });
});
