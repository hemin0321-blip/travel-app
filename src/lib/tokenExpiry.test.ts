import { describe, expect, it } from "vitest";
import { isTokenExpired } from "./tokenExpiry";

describe("isTokenExpired", () => {
  it("returns false when the current time is before expiry", () => {
    expect(isTokenExpired(1000, 500)).toBe(false);
  });

  it("returns true when the current time is at or after expiry", () => {
    expect(isTokenExpired(1000, 1000)).toBe(true);
    expect(isTokenExpired(1000, 1500)).toBe(true);
  });
});
