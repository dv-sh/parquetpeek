import { useEffect, useState } from "react";
import { api, type ColumnStats } from "../api";

export function StatsPanel({
  fileId,
  column,
  onClose,
}: {
  fileId: string;
  column: string;
  onClose: () => void;
}) {
  const [stats, setStats] = useState<ColumnStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStats(null);
    api
      .stats(fileId, column)
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch((e) => !cancelled && setError(String(e?.message || e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fileId, column]);

  return (
    <aside className="h-full w-80 shrink-0 overflow-auto border-l border-paper-200 dark:border-plum-600 bg-white/60 dark:bg-plum-700/40">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-paper-200 dark:border-plum-600 bg-white/95 dark:bg-plum-700/95 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-paper-400 dark:text-plum-300">column</div>
          <div className="truncate font-display text-base font-semibold text-paper-800 dark:text-paper-50" title={column}>{column}</div>
        </div>
        <button
          onClick={onClose}
          className="ml-2 flex h-7 w-7 items-center justify-center rounded-full text-paper-400 hover:bg-paper-200 hover:text-paper-700 dark:hover:bg-plum-600 dark:hover:text-paper-100 transition-colors"
          title="Close"
        >
          ×
        </button>
      </div>
      <div className="p-4">
        {loading && <div className="text-sm italic text-paper-400 dark:text-plum-300">crunching numbers…</div>}
        {error && <div className="rounded-md bg-brick-500/10 px-3 py-2 text-sm text-brick-500">{error}</div>}
        {stats && <StatsBody s={stats} />}
      </div>
    </aside>
  );
}

function StatsBody({ s }: { s: ColumnStats }) {
  const nullPct = s.count > 0 ? (s.null_count / s.count) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-paper-400 dark:text-plum-300">type</span>
        <span className="font-mono text-xs text-paper-700 dark:text-paper-100">{s.type}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="rows" value={s.count.toLocaleString()} />
        <Stat label="filled" value={s.non_null.toLocaleString()} />
        <Stat label="null" value={s.null_count.toLocaleString()} />
        <Stat label="null %" value={nullPct.toFixed(1) + "%"} />
      </div>

      {s.kind === "bool" && (
        <div>
          <SectionTitle>distribution</SectionTitle>
          <Bar label="true" value={s.true_count ?? 0} total={s.non_null} color="sage" />
          <Bar label="false" value={s.false_count ?? 0} total={s.non_null} color="brick" />
        </div>
      )}

      {s.kind === "numeric" && (
        <div>
          <SectionTitle>statistics</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="min" value={fmtNum(s.min)} />
            <Stat label="max" value={fmtNum(s.max)} />
            <Stat label="mean" value={fmtNum(s.mean)} />
            <Stat label="std dev" value={fmtNum(s.stddev)} />
            <Stat label="sum" value={fmtNum(s.sum)} />
          </div>
        </div>
      )}

      {s.kind === "string" && (
        <div>
          <SectionTitle>text</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="unique" value={(s.unique ?? 0).toLocaleString()} />
            <Stat label="avg length" value={fmtNum(s.avg_length)} />
          </div>
          {s.top && s.top.length > 0 && (
            <div className="mt-4">
              <SectionTitle>most common</SectionTitle>
              <ul className="space-y-1">
                {s.top.map((t, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-md border border-paper-200 dark:border-plum-600 bg-paper-50 dark:bg-plum-800/60 px-2.5 py-1.5 text-xs">
                    <span className="truncate" title={String(t.value)}>{String(t.value)}</span>
                    <span className="shrink-0 font-mono tabular-nums text-paper-500 dark:text-plum-300">{t.count.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {s.kind === "temporal" && (
        <div>
          <SectionTitle>range</SectionTitle>
          <div className="grid grid-cols-1 gap-2">
            <Stat label="earliest" value={String(s.min ?? "")} />
            <Stat label="latest" value={String(s.max ?? "")} />
          </div>
        </div>
      )}

      {s.kind === "categorical" && s.top && (
        <div>
          <SectionTitle>most common</SectionTitle>
          <ul className="space-y-1">
            {s.top.map((t, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-md border border-paper-200 dark:border-plum-600 bg-paper-50 dark:bg-plum-800/60 px-2.5 py-1.5 text-xs">
                <span className="truncate">{String(t.value)}</span>
                <span className="font-mono tabular-nums text-paper-500 dark:text-plum-300">{t.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function fmtNum(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (Math.abs(v) >= 1e6 || (Math.abs(v) < 1e-3 && v !== 0)) return v.toExponential(3);
    return Number.isInteger(v) ? v.toLocaleString() : v.toFixed(4);
  }
  return String(v);
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-paper-200 dark:border-plum-600 bg-paper-50 dark:bg-plum-800/60 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-widest text-paper-400 dark:text-plum-300">{label}</div>
      <div className="truncate text-sm font-medium tabular-nums text-paper-800 dark:text-paper-50">{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-paper-400 dark:text-plum-300">{children}</div>
  );
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: "sage" | "brick" | "clay" }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const bg = color === "sage" ? "bg-sage-500" : color === "brick" ? "bg-brick-500" : "bg-clay-500";
  return (
    <div className="mb-2.5">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-mono font-medium">{label}</span>
        <span className="tabular-nums text-paper-500 dark:text-plum-300">{value.toLocaleString()} <span className="text-paper-400 dark:text-plum-400">({pct.toFixed(1)}%)</span></span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-paper-200 dark:bg-plum-600">
        <div className={`h-full ${bg} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
