const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export class SheetsClient {
  private spreadsheetId: string;
  private getToken: () => string;

  constructor(spreadsheetId: string, getToken: () => string) {
    this.spreadsheetId = spreadsheetId;
    this.getToken = getToken;
  }

  async getValues(sheetName: string, range = "A2:Z1000"): Promise<string[][]> {
    const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(`${sheetName}!${range}`)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${this.getToken()}` } });
    if (!res.ok) throw new Error(`Sheets read failed: ${res.status}`);
    const data = await res.json();
    return data.values ?? [];
  }

  async appendRow(sheetName: string, row: string[]): Promise<void> {
    const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(`${sheetName}!A1`)}:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    });
    if (!res.ok) throw new Error(`Sheets append failed: ${res.status}`);
  }

  async updateRow(sheetName: string, rowNumber: number, row: string[]): Promise<void> {
    const lastCol = String.fromCharCode(65 + row.length - 1);
    const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(
      `${sheetName}!A${rowNumber}:${lastCol}${rowNumber}`
    )}?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    });
    if (!res.ok) throw new Error(`Sheets update failed: ${res.status}`);
  }

  async findRowNumberById(sheetName: string, id: string): Promise<number | null> {
    const rows = await this.getValues(sheetName);
    const idx = rows.findIndex((r) => r[0] === id);
    return idx === -1 ? null : idx + 2;
  }
}
