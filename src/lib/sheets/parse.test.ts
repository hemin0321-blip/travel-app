import { describe, expect, it } from "vitest";
import {
  parseTrips,
  tripToRow,
  parseSegments,
  segmentToRow,
  parseItineraryItems,
  itineraryItemToRow,
  parseChecklistItems,
  checklistItemToRow,
  parseRentalCars,
  rentalCarToRow,
} from "./parse";

describe("parseTrips", () => {
  it("converts sheet rows into Trip objects", () => {
    const rows = [["t1", "제주 여행", "2026-09-01", "2026-09-04"]];
    expect(parseTrips(rows)).toEqual([
      { tripId: "t1", name: "제주 여행", startDate: "2026-09-01", endDate: "2026-09-04" },
    ]);
  });

  it("skips rows with no ID", () => {
    expect(parseTrips([["", "빈행"]])).toEqual([]);
  });
});

describe("tripToRow", () => {
  it("converts a Trip back into a row", () => {
    const trip = { tripId: "t1", name: "제주 여행", startDate: "2026-09-01", endDate: "2026-09-04" };
    expect(tripToRow(trip)).toEqual(["t1", "제주 여행", "2026-09-01", "2026-09-04"]);
  });
});

describe("parseSegments", () => {
  it("converts sheet rows into Segment objects, parsing order as a number", () => {
    const rows = [["s1", "t1", "제주시", "1", "2026-09-01", "2026-09-02"]];
    expect(parseSegments(rows)).toEqual([
      { segmentId: "s1", tripId: "t1", place: "제주시", order: 1, startDate: "2026-09-01", endDate: "2026-09-02" },
    ]);
  });
});

describe("segmentToRow", () => {
  it("converts a Segment back into a row, formatting order as a string", () => {
    const segment = { segmentId: "s1", tripId: "t1", place: "제주시", order: 1, startDate: "2026-09-01", endDate: "2026-09-02" };
    expect(segmentToRow(segment)).toEqual(["s1", "t1", "제주시", "1", "2026-09-01", "2026-09-02"]);
  });
});

describe("parseItineraryItems", () => {
  it("converts sheet rows into ItineraryItem objects", () => {
    const rows = [["i1", "s1", "숙소 A", "제주시 어딘가", "렌터카", "체크인 3시", "R123", "숙소", "1", "15:00"]];
    expect(parseItineraryItems(rows)).toEqual([
      {
        itemId: "i1",
        segmentId: "s1",
        placeName: "숙소 A",
        address: "제주시 어딘가",
        transport: "렌터카",
        memo: "체크인 3시",
        reservationNumber: "R123",
        category: "숙소",
        order: 1,
        time: "15:00",
      },
    ]);
  });

  it("defaults time to an empty string for rows saved before the time column existed", () => {
    const rows = [["i1", "s1", "숙소 A", "", "", "", "", "숙소", "1"]];
    expect(parseItineraryItems(rows)[0].time).toBe("");
  });
});

describe("itineraryItemToRow", () => {
  it("converts an ItineraryItem back into a row", () => {
    const item = {
      itemId: "i1",
      segmentId: "s1",
      placeName: "숙소 A",
      address: "제주시 어딘가",
      transport: "렌터카",
      memo: "체크인 3시",
      reservationNumber: "R123",
      category: "숙소",
      order: 1,
      time: "15:00",
    };
    expect(itineraryItemToRow(item)).toEqual([
      "i1",
      "s1",
      "숙소 A",
      "제주시 어딘가",
      "렌터카",
      "체크인 3시",
      "R123",
      "숙소",
      "1",
      "15:00",
    ]);
  });
});

describe("parseChecklistItems", () => {
  it("parses the done column as a boolean", () => {
    const rows = [
      ["c1", "t1", "여권", "TRUE"],
      ["c2", "t1", "충전기", "FALSE"],
    ];
    expect(parseChecklistItems(rows)).toEqual([
      { checkId: "c1", tripId: "t1", label: "여권", done: true },
      { checkId: "c2", tripId: "t1", label: "충전기", done: false },
    ]);
  });
});

describe("checklistItemToRow", () => {
  it("formats done as TRUE/FALSE strings", () => {
    expect(checklistItemToRow({ checkId: "c1", tripId: "t1", label: "여권", done: true })).toEqual(["c1", "t1", "여권", "TRUE"]);
    expect(checklistItemToRow({ checkId: "c2", tripId: "t1", label: "충전기", done: false })).toEqual(["c2", "t1", "충전기", "FALSE"]);
  });
});

describe("parseRentalCars", () => {
  it("converts sheet rows into RentalCar objects", () => {
    const rows = [["t1", "2026-09-01", "2026-09-04", "제주공항", "롯데렌터카", "10:00", "18:00"]];
    expect(parseRentalCars(rows)).toEqual([
      {
        tripId: "t1",
        pickupDate: "2026-09-01",
        returnDate: "2026-09-04",
        location: "제주공항",
        company: "롯데렌터카",
        pickupTime: "10:00",
        returnTime: "18:00",
      },
    ]);
  });

  it("skips rows with no trip ID", () => {
    expect(parseRentalCars([["", "2026-09-01"]])).toEqual([]);
  });
});

describe("rentalCarToRow", () => {
  it("converts a RentalCar back into a row", () => {
    const car = {
      tripId: "t1",
      pickupDate: "2026-09-01",
      returnDate: "2026-09-04",
      location: "제주공항",
      company: "롯데렌터카",
      pickupTime: "10:00",
      returnTime: "18:00",
    };
    expect(rentalCarToRow(car)).toEqual([
      "t1",
      "2026-09-01",
      "2026-09-04",
      "제주공항",
      "롯데렌터카",
      "10:00",
      "18:00",
    ]);
  });
});
