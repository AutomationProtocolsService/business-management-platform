import { utils, writeFileXLSX } from "xlsx";

/**
 * Receives an array of plain objects (1 object = 1 row) and a filename.
 * Converts it to a single-sheet XLSX file and triggers the download.
 */
export function exportArrayToExcel<T extends Record<string, any>>(
  rows: T[],
  fileName = "export.xlsx",
  sheetName = "Sheet1"
) {
  // 1. Convert Array -> worksheet
  const ws = utils.json_to_sheet(rows, { header: Object.keys(rows[0] ?? {}) });
  // 2. Create new workbook & append
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, sheetName);
  // 3. Download
  writeFileXLSX(wb, fileName);
}