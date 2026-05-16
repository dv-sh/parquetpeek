import { useState } from "react";
import { api } from "../api";

export function FilePicker({ onOpen }: { onOpen: (path: string) => void }) {
  const [path, setPath] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!path.trim()) return;
    setError(null);
    onOpen(path.trim());
  };

  const pickNative = async () => {
    try {
      const r = await api.pick();
      if (r.path) onOpen(r.path);
    } catch (e: any) {
      setError("Native file dialog only works in the desktop app. Paste the path or drag the file in instead.");
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          // @ts-ignore — pywebview exposes .path on File
          const p = (f as any)?.path as string | undefined;
          if (p) onOpen(p);
          else if (f) setPath(f.name);
        }}
        className={`mx-auto w-full max-w-xl rounded-2xl border-2 border-dashed p-12 text-center transition-all
          ${dragging
            ? "border-clay-500 bg-clay-50 dark:bg-clay-500/10 scale-[1.01]"
            : "border-paper-300 dark:border-plum-500 bg-white/70 dark:bg-plum-700/40 shadow-soft"}`}
      >
        <div className="mb-2 flex items-center justify-center gap-2">
          <span className="inline-block h-8 w-8 rounded-lg bg-gradient-to-br from-clay-400 to-clay-600 shadow-warm" />
          <h1 className="font-display text-4xl font-semibold tracking-tight text-paper-800 dark:text-paper-50">
            ParquetPeek
          </h1>
        </div>
        <p className="mb-8 font-display italic text-paper-500 dark:text-paper-300">
          a kinder way to read your parquet files
        </p>

        <button onClick={pickNative} className="btn-primary mb-5">
          Choose a file
        </button>

        <div className="mb-3 flex items-center gap-3 text-xs text-paper-400 dark:text-plum-300">
          <span className="h-px flex-1 bg-paper-200 dark:bg-plum-500" />
          <span className="uppercase tracking-widest">or paste a path</span>
          <span className="h-px flex-1 bg-paper-200 dark:bg-plum-500" />
        </div>

        <div className="flex gap-2">
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="C:\path\to\your\file.parquet"
            className="flex-1 rounded-md border border-paper-300 dark:border-plum-500 bg-paper-50 dark:bg-plum-800 px-3 py-2 font-mono text-sm outline-none transition-colors focus:border-clay-500 focus:ring-2 focus:ring-clay-500/20"
          />
          <button onClick={submit} className="btn">Open</button>
        </div>
        {error && (
          <div className="mt-3 rounded-md bg-brick-500/10 px-3 py-2 text-xs text-brick-500">
            {error}
          </div>
        )}
        <div className="mt-7 text-[11px] text-paper-400 dark:text-plum-300">
          tip · you can also drag a <code className="font-mono">.parquet</code> file onto this window
        </div>
      </div>
    </div>
  );
}
