export type ColumnInfo = {
  name: string;
  type: string;
  nullable: boolean;
  physical_type?: string | null;
  logical_type?: string | null;
};

export type RowGroupInfo = {
  index: number;
  num_rows: number;
  total_byte_size: number;
  compression?: string | null;
};

export type FileSchema = {
  file_id: string;
  name: string;
  path: string;
  size_bytes: number;
  num_rows: number;
  num_columns: number;
  num_row_groups: number;
  format_version?: string;
  created_by?: string;
  columns: ColumnInfo[];
  row_groups: RowGroupInfo[];
};

export type RowsResponse = {
  offset: number;
  limit: number;
  total: number;
  columns: string[];
  rows: Record<string, unknown>[];
};

export type ColumnStats = {
  column: string;
  kind: "bool" | "numeric" | "string" | "temporal" | "categorical" | "other";
  type: string;
  count: number;
  null_count: number;
  non_null: number;
  true_count?: number;
  false_count?: number;
  min?: unknown;
  max?: unknown;
  mean?: number;
  stddev?: number;
  sum?: number;
  unique?: number;
  top?: { value: unknown; count: number }[];
  avg_length?: number;
};

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await res.json();
      msg = data.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  open: (path: string) =>
    jsonFetch<{ file_id: string }>("/api/open", {
      method: "POST",
      body: JSON.stringify({ path }),
    }),
  schema: (fileId: string) => jsonFetch<FileSchema>(`/api/files/${fileId}/schema`),
  rows: (fileId: string, offset: number, limit: number, columns?: string[]) => {
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
    if (columns && columns.length) params.set("columns", columns.join(","));
    return jsonFetch<RowsResponse>(`/api/files/${fileId}/rows?${params}`);
  },
  stats: (fileId: string, column: string) =>
    jsonFetch<ColumnStats>(`/api/files/${fileId}/stats/${encodeURIComponent(column)}`),
  query: (fileId: string, sql: string, limit = 1000) =>
    jsonFetch<{ columns: string[]; rows: Record<string, unknown>[]; row_count: number }>(
      `/api/files/${fileId}/query`,
      { method: "POST", body: JSON.stringify({ sql, limit }) }
    ),
  exportUrl: (fileId: string, format: "csv" | "json" | "xlsx") =>
    `/api/files/${fileId}/export?format=${format}`,
  pick: () => jsonFetch<{ path: string | null }>("/api/pick"),
};
