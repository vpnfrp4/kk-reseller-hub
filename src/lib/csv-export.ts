/**
 * CSV Export Utility
 * Converts an array of objects into a downloadable CSV file.
 */

export function exportToCsv(
  filename: string,
  rows: Record<string, any>[],
  columns?: { key: string; label: string }[]
) {
  if (!rows || rows.length === 0) return;

  const cols = columns || Object.keys(rows[0]).map((k) => ({ key: k, label: k }));

  const escapeCell = (value: any): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = cols.map((c) => escapeCell(c.label)).join(",");
  const body = rows
    .map((row) => cols.map((c) => escapeCell(row[c.key])).join(","))
    .join("\n");

  const csv = `${header}\n${body}`;
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
