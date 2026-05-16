import { useState } from "react";
import { api } from "../api";

export function QueryPanel({ fileId }: { fileId: string }) {
  const [sql, setSql] = useState("SELECT * FROM data LIMIT 100");
  const [result, setResult] = useState<{ columns: string[]; rows: Record<string, unknown>[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.query(fileId, sql);
      setResult({ columns: r.columns, rows: r.rows });
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-paper-200 dark:border-plum-600 bg-white/60 dark:bg-plum-700/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs text-paper-500 dark:text-plum-300">
            ask anything · the file is at{" "}
            <code className="rounded bg-paper-200 dark:bg-plum-700 px-1.5 py-0.5 font-mono text-clay-600 dark:text-clay-300">data</code>
          </div>
          <button onClick={run} disabled={loading} className="btn-primary">
            {loading ? "running…" : "run · ⌘↵"}
          </button>
        </div>
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") run();
          }}
          spellCheck={false}
          className="h-32 w-full resize-none rounded-md border border-paper-300 dark:border-plum-500 bg-paper-50 dark:bg-plum-800 p-3 font-mono text-sm outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
        />
      </div>
      <div className="flex-1 overflow-auto">
        {error && (
          <pre className="m-3 whitespace-pre-wrap rounded-md border border-brick-400/40 bg-brick-500/10 p-3 text-sm text-brick-500">
            {error}
          </pre>
        )}
        {result && (
          <div className="m-3 overflow-auto rounded-md border border-paper-200 dark:border-plum-600 shadow-soft">
            <table className="min-w-full text-sm">
              <thead className="bg-paper-100 dark:bg-plum-700">
                <tr>
                  {result.columns.map((c) => (
                    <th key={c} className="border-b border-paper-200 dark:border-plum-600 px-3 py-2 text-left font-display font-semibold text-paper-800 dark:text-paper-50">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r, i) => (
                  <tr key={i} className={`border-b border-paper-100 dark:border-plum-700/60 ${i % 2 ? "bg-paper-50/40 dark:bg-plum-800/30" : ""}`}>
                    {result.columns.map((c) => (
                      <td key={c} className="max-w-md truncate px-3 py-1.5 align-top" title={String(r[c] ?? "")}>
                        {r[c] === null || r[c] === undefined
                          ? <span className="italic text-paper-400 dark:text-plum-300">—</span>
                          : typeof r[c] === "object"
                            ? <code className="font-mono text-xs">{JSON.stringify(r[c])}</code>
                            : String(r[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-paper-200 dark:border-plum-600 bg-paper-50 dark:bg-plum-800 px-3 py-1.5 text-xs italic text-paper-500 dark:text-plum-300">
              {result.rows.length.toLocaleString()} rows
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
