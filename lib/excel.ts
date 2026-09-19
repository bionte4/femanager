/** Shared Excel helpers untuk bulk import/export master data */

export const EXCEL_IMPORT_MAX_ROWS = 500;

export function normalizeExcelHeaders(raw: Record<string, unknown>) {
  const map: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = k.trim().toLowerCase().replace(/\s+/g, "_");
    map[key] = v;
  }
  return map;
}

export function parseBoolCell(v: unknown, defaultValue = true): boolean {
  if (v === null || v === undefined || v === "") return defaultValue;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "yes", "y", "ya", "aktif", "active"].includes(s)) return true;
  if (["0", "false", "no", "n", "tidak", "nonaktif", "inactive"].includes(s))
    return false;
  return defaultValue;
}

export type ExcelPreviewAction = "create" | "update" | "error";

export type ExcelActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };
