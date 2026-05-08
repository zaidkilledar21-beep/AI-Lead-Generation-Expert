export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

export type CsvMetadata = ReadonlyArray<readonly [string, string | number]>;

function escapeCsvValue(value: string | number | null | undefined) {
  if (value == null) return "";
  const text = String(value);
  const needsQuotes = text.includes(",") || text.includes("\"") || text.includes("\n") || text.includes("\r");
  const escaped = text.split("\"").join("\"\"");
  return needsQuotes ? `"${escaped}"` : escaped;
}

function serializeRow(values: Array<string | number | null | undefined>) {
  return values.map(escapeCsvValue).join(",");
}

export function serializeCsv<T>(columns: CsvColumn<T>[], rows: T[], metadata: CsvMetadata = []) {
  const lines = metadata.map(([key, value]) => serializeRow([key, value]));
  if (metadata.length > 0) lines.push("");
  lines.push(serializeRow(columns.map((column) => column.header)));
  for (const row of rows) {
    lines.push(serializeRow(columns.map((column) => column.value(row))));
  }
  return `${lines.join("\r\n")}\r\n`;
}
