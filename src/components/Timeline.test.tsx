import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Timeline } from "./Timeline";

const items = [
  { itemId: "i1", segmentId: "s1", placeName: "숙소 A", address: "", transport: "", memo: "", reservationNumber: "", category: "숙소", order: 2 },
  { itemId: "i2", segmentId: "s1", placeName: "공영주차장", address: "", transport: "", memo: "", reservationNumber: "", category: "주차", order: 1 },
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
});
