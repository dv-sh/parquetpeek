import { useCallback, useEffect, useState } from "react";
import { api, type FileSchema } from "./api";
import { FilePicker } from "./components/FilePicker";
import { SchemaPanel } from "./components/SchemaPanel";
import { DataGrid } from "./components/DataGrid";
import { StatsPanel } from "./components/StatsPanel";
import { QueryPanel } from "./components/QueryPanel";

type Tab = "data" | "query";
const PAGE_SIZE = 500;

export default function App() {
  const [fileId, setFileId] = useState<string | null>(null);
  const [schema, setSchema] = useState<FileSchema | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeCol, setActiveCol] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("data");
  const [wrap, setWrap] = useState(true);
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark"
      || (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const openFile = useCallback(async (path: string) => {
    setError(null);
    setLoading(true);
    setRows([]);
    setActiveCol(null);
    try {
      const opened = await api.open(path);
      const sch = await api.schema(opened.file_id);
      setFileId(opened.file_id);
      setSchema(sch);
      setTotal(sch.num_rows);
      const r = await api.rows(opened.file_id, 0, PAGE_SIZE);
      setRows(r.rows);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!fileId || loading) return;
    if (rows.length >= total) return;
    setLoading(true);
    try {
      const r = await api.rows(fileId, rows.length, PAGE_SIZE);
      setRows((prev) => [...prev, ...r.rows]);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [fileId, loading, rows.length, total]);

  const closeFile = () => {
    setFileId(null);
    setSchema(null);
    setRows([]);
    setActiveCol(null);
    setTab("data");
  };

  if (!fileId || !schema) {
    return (
      <div className="h-screen w-screen">
        <Toolbar
          dark={dark}
          onToggleTheme={() => setDark((d) => !d)}
          schema={null}
          tab={tab}
          setTab={setTab}
          wrap={wrap}
          setWrap={setWrap}
          onClose={closeFile}
        />
        {error && <ErrorBar message={error} onClose={() => setError(null)} />}
        <FilePicker onOpen={openFile} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col">
      <Toolbar
        dark={dark}
        onToggleTheme={() => setDark((d) => !d)}
        schema={schema}
        tab={tab}
        setTab={setTab}
        wrap={wrap}
        setWrap={setWrap}
        onClose={closeFile}
      />
      {error && <ErrorBar message={error} onClose={() => setError(null)} />}
      <div className="flex min-h-0 flex-1">
        <SchemaPanel
          schema={schema}
          activeColumn={activeCol}
          onColumnClick={(c) => {
            setTab("data");
            setActiveCol((cur) => (cur === c ? null : c));
          }}
        />
        <main className="flex min-w-0 flex-1 flex-col">
          {tab === "data" ? (
            <DataGrid
              columns={schema.columns}
              rows={rows}
              totalRows={total}
              loading={loading}
              wrapText={wrap}
              onColumnClick={(c) => setActiveCol((cur) => (cur === c ? null : c))}
              activeColumn={activeCol}
              loadMore={loadMore}
              canLoadMore={rows.length < total}
            />
          ) : (
            <QueryPanel fileId={fileId} />
          )}
          <StatusBar shown={rows.length} total={total} loading={loading} />
        </main>
        {activeCol && tab === "data" && (
          <StatsPanel fileId={fileId} column={activeCol} onClose={() => setActiveCol(null)} />
        )}
      </div>
    </div>
  );
}

function Toolbar({
  dark,
  onToggleTheme,
  schema,
  tab,
  setTab,
  wrap,
  setWrap,
  onClose,
}: {
  dark: boolean;
  onToggleTheme: () => void;
  schema: FileSchema | null;
  tab: Tab;
  setTab: (t: Tab) => void;
  wrap: boolean;
  setWrap: (v: boolean) => void;
  onClose: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-paper-200 dark:border-plum-600 bg-white/80 dark:bg-plum-700/80 backdrop-blur px-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-block h-6 w-6 rounded-md bg-gradient-to-br from-clay-400 to-clay-600 shadow-warm" />
          <span className="font-display text-xl font-semibold tracking-tight text-paper-800 dark:text-paper-50">
            ParquetPeek
          </span>
        </div>
        {schema && (
          <>
            <span className="text-paper-300 dark:text-plum-400">·</span>
            <span className="truncate font-display italic text-paper-600 dark:text-paper-200 max-w-[40ch]" title={schema.path}>
              {schema.name}
            </span>
            <span className="pill">{schema.num_rows.toLocaleString()} rows</span>
            <span className="pill">{schema.num_columns} cols</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {schema && (
          <>
            <div className="flex overflow-hidden rounded-md border border-paper-300 dark:border-plum-500 text-xs">
              <button
                onClick={() => setTab("data")}
                className={`px-3 py-1.5 font-medium transition-colors ${tab === "data" ? "bg-clay-500 text-white" : "bg-white dark:bg-plum-700 hover:bg-paper-100 dark:hover:bg-plum-600 text-paper-700 dark:text-paper-100"}`}
              >
                data
              </button>
              <button
                onClick={() => setTab("query")}
                className={`px-3 py-1.5 font-medium transition-colors ${tab === "query" ? "bg-clay-500 text-white" : "bg-white dark:bg-plum-700 hover:bg-paper-100 dark:hover:bg-plum-600 text-paper-700 dark:text-paper-100"}`}
              >
                sql
              </button>
            </div>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-paper-300 dark:border-plum-500 bg-white dark:bg-plum-700 px-2.5 py-1.5 text-xs text-paper-700 dark:text-paper-100 hover:bg-paper-100 dark:hover:bg-plum-600 transition-colors">
              <input type="checkbox" checked={wrap} onChange={(e) => setWrap(e.target.checked)} className="accent-clay-500" />
              wrap text
            </label>
            <ExportMenu fileId={schema.file_id} name={schema.name} />
            <button onClick={onClose} className="btn" title="Close file">close</button>
          </>
        )}
        <button
          onClick={onToggleTheme}
          className="btn h-8 w-8 !p-0"
          title={dark ? "Switch to light" : "Switch to dark"}
        >
          {dark ? "☼" : "☾"}
        </button>
      </div>
    </header>
  );
}

function ExportMenu({ fileId, name }: { fileId: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="btn"
      >
        save as ▾
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-paper-200 dark:border-plum-500 bg-white dark:bg-plum-700 shadow-soft">
          {(
            [
              ["csv", "csv · spreadsheet"],
              ["json", "json · structured"],
              ["xlsx", "xlsx · excel"],
            ] as const
          ).map(([fmt, label]) => (
            <a
              key={fmt}
              href={api.exportUrl(fileId, fmt)}
              download={`${name}.${fmt}`}
              className="block px-3 py-2 text-sm text-paper-700 dark:text-paper-100 hover:bg-clay-500/10 hover:text-clay-600 dark:hover:text-clay-300"
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBar({ shown, total, loading }: { shown: number; total: number; loading: boolean }) {
  return (
    <div className="flex h-7 shrink-0 items-center justify-between border-t border-paper-200 dark:border-plum-600 bg-paper-50/80 dark:bg-plum-800/80 px-4 text-xs italic text-paper-500 dark:text-plum-300">
      <span>{loading ? "loading…" : "ready"}</span>
      <span className="tabular-nums">
        {shown.toLocaleString()} / {total.toLocaleString()} rows loaded
      </span>
    </div>
  );
}

function ErrorBar({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-brick-400/40 bg-brick-500/10 px-4 py-2 text-sm text-brick-500">
      <span className="truncate">⚠  {message}</span>
      <button onClick={onClose} className="text-brick-400 hover:text-brick-500">×</button>
    </div>
  );
}
