import { utils, write } from "xlsx";
import { saveAs } from "file-saver";

export function exportToXlsx(tabName: string, rows: any[]) {
  if (!rows || rows.length === 0) {
    console.warn(`No data to export for ${tabName}`);
    return;
  }

  // Convert data to worksheet
  const ws = utils.json_to_sheet(rows);
  
  // Create workbook and add worksheet
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, tabName);
  
  // Generate Excel file and trigger download
  const excelBuffer = write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  
  // Create filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${tabName}-${timestamp}.xlsx`;
  
  saveAs(blob, filename);
}

export function exportMultipleSheets(data: { [sheetName: string]: any[] }, filename: string) {
  const wb = utils.book_new();
  
  // Add each data set as a separate sheet
  Object.entries(data).forEach(([sheetName, rows]) => {
    if (rows && rows.length > 0) {
      const ws = utils.json_to_sheet(rows);
      utils.book_append_sheet(wb, ws, sheetName);
    }
  });
  
  // Generate Excel file and trigger download
  const excelBuffer = write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = `${filename}-${timestamp}.xlsx`;
  
  saveAs(blob, finalFilename);
}