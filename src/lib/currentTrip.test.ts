import { beforeEach, describe, expect, it } from "vitest";
import { getCurrentTripId, setCurrentTripId } from "./currentTrip";

describe("currentTrip", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no trip has ever been selected", () => {
    expect(getCurrentTripId()).toBeNull();
  });

  it("persists the selected trip id across reads", () => {
    setCurrentTripId("t1");
    expect(getCurrentTripId()).toBe("t1");
  });

  it("overwrites the previous selection when a different trip is picked", () => {
    setCurrentTripId("t1");
    setCurrentTripId("t2");
    expect(getCurrentTripId()).toBe("t2");
  });
});
