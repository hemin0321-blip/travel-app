import { beforeEach, describe, expect, it, vi } from "vitest";
import { SheetsClient } from "./client";

describe("SheetsClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: SheetsClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    client = new SheetsClient("sheet-123", () => "fake-token");
  });

  it("getValues calls the values.get endpoint with the bearer token and returns rows", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ values: [["a", "b"]] }) });

    const rows = await client.getValues("여행");

    expect(rows).toEqual([["a", "b"]]);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("sheet-123");
    expect(url).toContain(encodeURIComponent("여행!A2:Z1000"));
    expect(options.headers.Authorization).toBe("Bearer fake-token");
  });

  it("getValues returns an empty array when the sheet has no values", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    expect(await client.getValues("여행")).toEqual([]);
  });

  it("getValues throws when the response is not ok", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    await expect(client.getValues("여행")).rejects.toThrow("Sheets read failed: 403");
  });

  it("appendRow POSTs to the append endpoint with the row wrapped in values", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    await client.appendRow("여행", ["t1", "제주", "2026-09-01", "2026-09-04"]);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain(":append");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ values: [["t1", "제주", "2026-09-01", "2026-09-04"]] });
  });

  it("updateRow PUTs to a specific row range", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    await client.updateRow("체크리스트", 3, ["c1", "t1", "여권", "TRUE"]);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain(encodeURIComponent("체크리스트!A3:D3"));
    expect(options.method).toBe("PUT");
  });

  it("findRowNumberById returns the 1-based sheet row number for a matching id", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ values: [["c1"], ["c2"]] }) });
    expect(await client.findRowNumberById("체크리스트", "c2")).toBe(3);
  });

  it("findRowNumberById returns null when no row matches", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ values: [["c1"]] }) });
    expect(await client.findRowNumberById("체크리스트", "missing")).toBeNull();
  });

  it("ensureSheetExists does nothing when the sheet already exists", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ sheets: [{ properties: { title: "여행" } }, { properties: { title: "렌터카" } }] }),
    });

    await client.ensureSheetExists("렌터카");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ensureSheetExists creates the sheet via batchUpdate when it's missing", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sheets: [{ properties: { title: "여행" } }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await client.ensureSheetExists("렌터카");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, options] = fetchMock.mock.calls[1];
    expect(url).toContain(":batchUpdate");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      requests: [{ addSheet: { properties: { title: "렌터카" } } }],
    });
  });

  it("ensureSheetExists throws when sheet creation fails", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sheets: [] }) })
      .mockResolvedValueOnce({ ok: false, status: 403 });

    await expect(client.ensureSheetExists("렌터카")).rejects.toThrow("Sheet creation failed: 403");
  });
});
