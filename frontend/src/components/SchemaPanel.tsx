import type { FileSchema } from "../api";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  for (const u of units) {
    if (v < 1024) return `${v.toFixed(v < 10 ? 2 : 1)} ${u}`;
    v /= 1024;
  }
  return `${v.toFixed(1)} PB`;
}

const TYPE_COLORS: Record<string, string> = {
  bool: "text-sage-500",
  int: "text-clay-500",
  float: "text-clay-500",
  double: "text-clay-500",
  string: "text-plum-400 dark:text-paper-300",
  date: "text-sage-500",
  timestamp: "text-sage-500",
  struct: "text-clay-400",
  list: "text-clay-400",
};

function typeColor(t: string): string {
  const lower = t.toLowerCase();
  for (const key of Object.keys(TYPE_COLORS)) {
    if (lower.includes(key)) return TYPE_COLORS[key];
  }
  return "text-paper-400 dark:text-plum-300";
}

export function SchemaPanel({
  schema,
  activeColumn,
  onColumnClick,
}: {
  schema: FileSchema;
  activeColumn: string | null;
  onColumnClick: (name: string) => void;
}) {
  return (
    <aside className="h-full w-72 shrink-0 overflow-auto border-r border-paper-200 dark:border-plum-600 bg-white/60 dark:bg-plum-700/40">
      <div className="border-b border-paper-200 dark:border-plum-600 p-4">
        <div className="font-display text-base font-semibold truncate text-paper-800 dark:text-paper-50" title={schema.name}>
          {schema.name}
        </div>
        <div className="mt-1 truncate font-mono text-[11px] text-paper-400 dark:text-plum-300" title={schema.path}>
          {schema.path}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <Stat label="rows" value={schema.num_rows.toLocaleString()} />
          <Stat label="cols" value={String(schema.num_columns)} />
          <Stat label="size" value={fmtBytes(schema.size_bytes)} />
          <Stat label="groups" value={String(schema.num_row_groups)} />
        </div>
        {schema.created_by && (
          <div className="mt-2 truncate text-[11px] italic text-paper-400 dark:text-plum-300" title={schema.created_by}>
            written by {schema.created_by}
          </div>
        )}
      </div>
      <div className="p-2">
        <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-paper-400 dark:text-plum-300">
          columns
        </div>
        <ul className="space-y-0.5">
          {schema.columns.map((c) => (
            <li key={c.name}>
              <button
                onClick={() => onColumnClick(c.name)}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors
                  ${activeColumn === c.name
                    ? "bg-clay-500/15 text-clay-600 dark:text-clay-300"
                    : "hover:bg-paper-100 dark:hover:bg-plum-600/60 text-paper-700 dark:text-paper-100"}`}
              >
                <span className="truncate font-medium">{c.name}</span>
                <span className={`shrink-0 font-mono text-[10px] ${typeColor(c.type)}`}>{c.type}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-paper-200 dark:border-plum-600 bg-paper-50 dark:bg-plum-800/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-widest text-paper-400 dark:text-plum-300">{label}</div>
      <div className="font-medium tabular-nums text-paper-800 dark:text-paper-50">{value}</div>
    </div>
  );
}
