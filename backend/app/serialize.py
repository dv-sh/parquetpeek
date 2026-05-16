"""Convert pyarrow tables to JSON-safe rows."""
from __future__ import annotations

import base64
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any

import pyarrow as pa


def table_to_records(table: pa.Table) -> list[dict[str, Any]]:
    cols = table.column_names
    py_cols = [table.column(c).to_pylist() for c in cols]
    n = table.num_rows
    out: list[dict[str, Any]] = []
    for i in range(n):
        row: dict[str, Any] = {}
        for ci, name in enumerate(cols):
            row[name] = _to_json_safe(py_cols[ci][i])
        out.append(row)
    return out


def _to_json_safe(v: Any) -> Any:
    if v is None:
        return None
    if isinstance(v, (str, int, bool)):
        return v
    if isinstance(v, float):
        # JSON doesn't allow NaN/Inf
        import math
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    if isinstance(v, (datetime, date, time)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return str(v)
    if isinstance(v, bytes):
        try:
            return v.decode("utf-8")
        except UnicodeDecodeError:
            return "base64:" + base64.b64encode(v).decode("ascii")
    if isinstance(v, dict):
        return {str(k): _to_json_safe(val) for k, val in v.items()}
    if isinstance(v, (list, tuple)):
        return [_to_json_safe(x) for x in v]
    return str(v)
