// RFC 4180 CSV with protection against spreadsheet formula injection
// (cells starting with = + - @ tab or CR are prefixed with an apostrophe).

export type CsvValue = string | number | boolean | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let s = typeof value === "string" ? value : String(value);
  if (typeof value === "string" && FORMULA_START.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) {
    s = `'${s}`;
  }
  if (/[",\r\n]/.test(s) || s.startsWith("'")) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))];
  // BOM so Excel opens UTF-8 (e.g. £) correctly.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
