# ParquetPeek

A friendly desktop viewer for `.parquet` files.

Most parquet viewers do a few things badly — long strings don't wrap, you can't see what's actually *inside* a column, and exporting needs another tool. ParquetPeek fixes those.

## Features

- **Smart text wrapping & expandable cells** — long strings/JSON wrap into paragraphs by default; click `expand` to see the full value.
- **Resizable columns** — drag any column edge to widen it.
- **Schema & metadata panel** — row count, column count, file size, row groups, format version, created-by.
- **Per-column statistics** — click any column header:
  - **Boolean** → true/false counts with distribution bars.
  - **Numeric** → min, max, mean, stddev, sum.
  - **String** → unique count, average length, top-10 most common values.
  - **Temporal** → min / max range.
- **DuckDB SQL tab** — run real SQL against the file (the parquet is exposed as a view called `data`).
- **Export** — CSV, JSON, or XLSX in one click.
- **Virtualized grid** — millions of rows scroll smoothly. Rows load on demand as you scroll.
- **Light & dark mode**.

---

## Quick start

You need **Python 3.10+** and **Node.js 18+** (Node includes `npm`). Get Node from <https://nodejs.org/> if you don't have it.

### Option A — Desktop app (recommended)

One command from the project root.

**Windows (PowerShell):**

```powershell
.\desktop.ps1
```

**macOS / Linux:**

```bash
chmod +x desktop.sh
./desktop.sh
```

On the first run the script creates a Python venv, installs backend dependencies, installs frontend dependencies, builds the React bundle, and launches the native window. Subsequent runs skip the install/build steps and start in a couple of seconds.

### Option B — Run in your browser (dev mode, hot reload)

Useful if you want to hack on the code.

```bash
# 1) Backend (terminal 1)
cd backend
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
python run_dev.py
# → API listening on http://127.0.0.1:8000

# 2) Frontend (terminal 2)
cd frontend
npm install
npm run dev
# → open http://localhost:5173
```

The Vite dev server proxies `/api/*` to the backend automatically.

> **Note** — in browser/dev mode the **Choose file…** button (which uses a native OS dialog) is disabled. Paste the absolute path of the file into the input box instead, or drag-and-drop the parquet onto the drop zone. In desktop mode (Option A) the native picker works.

### Try it with a sample file

If you don't have a `.parquet` handy:

```bash
cd backend
# activate venv first (see above)
python make_sample.py
```

This writes `backend/sample.parquet` (2000 rows, 7 mixed-type columns including long lorem-ipsum strings to show off the wrap feature). Open it from the UI.

---

## Architecture

```
parquet_making/
├── backend/                 Python · FastAPI · pyarrow · DuckDB
│   ├── app/
│   │   ├── main.py          REST API: /api/open, /schema, /rows, /stats, /query, /export, /pick
│   │   ├── store.py         In-process file registry (caches ParquetFile handles)
│   │   ├── stats.py         Per-column statistics by kind
│   │   └── serialize.py     JSON-safe row conversion (dates, decimals, bytes, NaN…)
│   ├── run_dev.py           Uvicorn with --reload on :8000 (dev mode)
│   ├── run_desktop.py       Pywebview launcher (random free port, native window)
│   ├── make_sample.py       Generate sample.parquet for testing
│   └── requirements.txt
├── frontend/                React 18 + Vite + TypeScript + Tailwind
│   └── src/
│       ├── App.tsx              Toolbar, layout, theme, tabs
│       ├── api.ts               Typed API client
│       └── components/
│           ├── FilePicker.tsx       Drag-drop / native dialog / path paste
│           ├── SchemaPanel.tsx      Left sidebar
│           ├── DataGrid.tsx         Virtualized, resizable, infinite-scroll grid
│           ├── Cell.tsx             Wrap / expand / per-type styling
│           ├── StatsPanel.tsx       Right sidebar with per-column kind-specific stats
│           └── QueryPanel.tsx       DuckDB SQL tab
├── desktop.ps1 / desktop.sh     One-click desktop launcher
└── README.md · LICENSE (MIT) · .gitignore
```

The backend keeps an in-process registry of opened files (`FileStore`) so we don't re-parse the parquet on every request. Row reads use `read_row_group`, so we never load the whole file into memory unless an export is requested.

In desktop mode, `run_desktop.py` starts uvicorn on a random free port in a thread and opens the built `frontend/dist` in a pywebview window. In dev mode, the backend and Vite dev server run separately and Vite proxies API calls.

---

## Troubleshooting

**`npm: not found`** — Install Node.js from <https://nodejs.org/> (LTS), then close and reopen your terminal.

**`ECONNREFUSED 127.0.0.1:8000`** in the Vite output — Backend isn't running. Open a second terminal and `python run_dev.py` in `backend/`.

**`No such file: ...`** in the UI — The path is wrong. Use the absolute path with backslashes on Windows (e.g. `C:\Users\you\file.parquet`); no quotes around it.

**`/api/pick` returns 400 in dev mode** — Expected. The native file dialog only works inside the pywebview desktop window. Paste the path or drag-and-drop instead.

**Pre-commit hook errors / `regex` deprecation** — Already fixed; pull latest.

**File dialog fails on Linux** — pywebview on Linux needs `python3-gi`, `gir1.2-webkit2-4.0`, or QT bindings depending on backend. See <https://pywebview.flowrl.com/guide/installation.html>.

---

## Roadmap

- [ ] Column filter chips (numeric range / string contains / bool)
- [ ] Sort by column
- [ ] Hide / reorder columns
- [ ] Bookmark recently-opened files
- [ ] Full-text search across string columns
- [ ] Histogram visualization in stats panel
- [ ] Multi-file / folder views (treat a directory of parquet shards as one dataset)
- [ ] PyInstaller-packaged single-binary release

PRs welcome.

## License

[MIT](LICENSE).
