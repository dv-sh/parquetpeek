"""FastAPI app for ParquetPeek."""
from __future__ import annotations

import io
import os
from typing import Optional

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .serialize import table_to_records
from .stats import compute_stats
from .store import store

app = FastAPI(title="ParquetPeek")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class OpenRequest(BaseModel):
    path: str


class QueryRequest(BaseModel):
    sql: str
    limit: int = 1000


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/open")
def open_file(req: OpenRequest) -> dict:
    try:
        f = store.open(req.path)
    except FileNotFoundError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(400, f"Failed to open parquet: {e}")
    return {
        "file_id": f.file_id,
        "name": f.name,
        "path": f.path,
        "size_bytes": f.size_bytes,
        "num_rows": f.pq_file.metadata.num_rows,
        "num_row_groups": f.pq_file.num_row_groups,
    }


@app.get("/api/files/{file_id}/schema")
def get_schema(file_id: str) -> dict:
    f = _get(file_id)
    pf = f.pq_file
    md = pf.metadata
    schema = pf.schema_arrow

    columns = []
    for i, field in enumerate(schema):
        columns.append({
            "name": field.name,
            "type": str(field.type),
            "nullable": field.nullable,
            "physical_type": str(md.schema.column(i).physical_type) if i < md.num_columns else None,
            "logical_type": str(md.schema.column(i).logical_type) if i < md.num_columns else None,
        })

    # Row group info (summary)
    row_groups = []
    for rg_i in range(md.num_row_groups):
        rg = md.row_group(rg_i)
        row_groups.append({
            "index": rg_i,
            "num_rows": rg.num_rows,
            "total_byte_size": rg.total_byte_size,
            "compression": rg.column(0).compression if rg.num_columns > 0 else None,
        })

    return {
        "file_id": f.file_id,
        "name": f.name,
        "path": f.path,
        "size_bytes": f.size_bytes,
        "num_rows": md.num_rows,
        "num_columns": md.num_columns,
        "num_row_groups": md.num_row_groups,
        "format_version": md.format_version,
        "created_by": md.created_by,
        "columns": columns,
        "row_groups": row_groups,
    }


@app.get("/api/files/{file_id}/rows")
def get_rows(
    file_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=5000),
    columns: Optional[str] = Query(None, description="comma-separated column names"),
) -> dict:
    f = _get(file_id)
    pf = f.pq_file
    md = pf.metadata
    total = md.num_rows

    if offset >= total:
        return {"offset": offset, "limit": 0, "total": total, "columns": [], "rows": []}

    col_list = None
    if columns:
        col_list = [c.strip() for c in columns.split(",") if c.strip()]

    # Walk row groups, slicing as needed
    needed = limit
    cur_offset = offset
    chunks: list[pa.Table] = []
    rows_seen = 0
    for rg_i in range(pf.num_row_groups):
        rg_rows = md.row_group(rg_i).num_rows
        rg_start = rows_seen
        rg_end = rows_seen + rg_rows
        rows_seen = rg_end
        if cur_offset >= rg_end:
            continue
        # Read this row group
        tbl = pf.read_row_group(rg_i, columns=col_list)
        local_start = max(0, cur_offset - rg_start)
        take = min(needed, rg_rows - local_start)
        if take <= 0:
            continue
        chunks.append(tbl.slice(local_start, take))
        cur_offset += take
        needed -= take
        if needed <= 0:
            break

    if not chunks:
        return {"offset": offset, "limit": 0, "total": total, "columns": col_list or [], "rows": []}

    table = pa.concat_tables(chunks)
    rows = table_to_records(table)
    return {
        "offset": offset,
        "limit": len(rows),
        "total": total,
        "columns": table.column_names,
        "rows": rows,
    }


@app.get("/api/files/{file_id}/stats/{column}")
def get_column_stats(file_id: str, column: str) -> dict:
    f = _get(file_id)
    pf = f.pq_file
    if column not in pf.schema_arrow.names:
        raise HTTPException(404, f"Column not found: {column}")
    table = pf.read(columns=[column])
    stats = compute_stats(table.column(column))
    stats["column"] = column
    return stats


@app.post("/api/files/{file_id}/query")
def run_query(file_id: str, req: QueryRequest) -> dict:
    f = _get(file_id)
    sql = req.sql.strip()
    if not sql:
        raise HTTPException(400, "Empty SQL")
    # Provide a virtual table "data" pointing at the parquet file
    con = duckdb.connect()
    try:
        con.execute(
            "CREATE OR REPLACE VIEW data AS SELECT * FROM read_parquet(?)",
            [f.path],
        )
        # Wrap with limit if user didn't add one
        wrapped = sql
        if "limit" not in sql.lower():
            wrapped = f"SELECT * FROM ({sql}) AS _q LIMIT {int(req.limit)}"
        rel = con.execute(wrapped)
        arrow_table = rel.fetch_arrow_table()
        rows = table_to_records(arrow_table)
        return {
            "columns": arrow_table.column_names,
            "rows": rows,
            "row_count": len(rows),
        }
    except Exception as e:
        raise HTTPException(400, f"Query failed: {e}")
    finally:
        con.close()


@app.get("/api/files/{file_id}/export")
def export(
    file_id: str,
    format: str = Query("csv", pattern="^(csv|json|xlsx)$"),
) -> StreamingResponse:
    f = _get(file_id)
    table = f.pq_file.read()

    if format == "csv":
        import pyarrow.csv as pc
        buf = io.BytesIO()
        pc.write_csv(table, buf)
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{f.name}.csv"'},
        )
    if format == "json":
        rows = table_to_records(table)
        import json
        data = json.dumps(rows, ensure_ascii=False, indent=2).encode("utf-8")
        return StreamingResponse(
            io.BytesIO(data),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{f.name}.json"'},
        )
    if format == "xlsx":
        df = table.to_pandas()
        buf = io.BytesIO()
        with __import__("pandas").ExcelWriter(buf, engine="openpyxl") as w:
            df.to_excel(w, index=False, sheet_name="data")
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{f.name}.xlsx"'},
        )
    raise HTTPException(400, "Unsupported format")


@app.post("/api/files/{file_id}/close")
def close_file(file_id: str) -> dict:
    store.close(file_id)
    return {"ok": True}


@app.get("/api/pick")
def pick_file() -> dict:
    """Open a native file dialog. Only works when launched via pywebview."""
    try:
        import webview
        windows = webview.windows
        if not windows:
            raise RuntimeError("No webview window")
        result = windows[0].create_file_dialog(
            webview.OPEN_DIALOG,
            allow_multiple=False,
            file_types=("Parquet files (*.parquet;*.pq)", "All files (*.*)"),
        )
        if not result:
            return {"path": None}
        path = result[0] if isinstance(result, (list, tuple)) else result
        return {"path": path}
    except Exception as e:
        raise HTTPException(400, f"File dialog unavailable: {e}")


def _get(file_id: str):
    try:
        return store.get(file_id)
    except KeyError:
        raise HTTPException(404, f"File not found: {file_id}")


# --- Static frontend (served when bundled) ---
# backend/app/main.py -> project root is two parents up
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir, os.pardir))
_FRONTEND_DIR = os.path.join(_PROJECT_ROOT, "frontend", "dist")
if os.path.isdir(_FRONTEND_DIR):
    # Mount last so /api/* routes take precedence
    app.mount("/", StaticFiles(directory=_FRONTEND_DIR, html=True), name="frontend")
