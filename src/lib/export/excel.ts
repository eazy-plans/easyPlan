import ExcelJS from "exceljs";

export interface ExcelColumn<T> {
  header: string;
  key: string;
  value: (row: T) => string | number | null;
  width?: number;
}

/**
 * Builds an .xlsx workbook from already-filtered rows and triggers a
 * browser download - no API route needed, the data is already loaded into
 * the table (G7). exceljs, not xlsx/SheetJS, per the CVE history on the
 * latter's prototype pollution bugs.
 */
export async function exportToExcel<T>(filename: string, sheetName: string, columns: ExcelColumn<T>[], rows: T[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName, { views: [{ rightToLeft: true }] });

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(Object.fromEntries(columns.map((c) => [c.key, c.value(row)])));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
