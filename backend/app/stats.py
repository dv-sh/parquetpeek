"""Column statistics. One pass over the column, returns a stats dict keyed by type family."""
from __future__ import annotations

from typing import Any

import pyarrow as pa
import pyarrow.compute as pc


def _is_bool(t: pa.DataType) -> bool:
    return pa.types.is_boolean(t)


def _is_numeric(t: pa.DataType) -> bool:
    return (
        pa.types.is_integer(t)
        or pa.types.is_floating(t)
        or pa.types.is_decimal(t)
    )


def _is_temporal(t: pa.DataType) -> bool:
    return (
        pa.types.is_temporal(t)
        or pa.types.is_date(t)
        or pa.types.is_timestamp(t)
        or pa.types.is_time(t)
    )


def _is_stringy(t: pa.DataType) -> bool:
    return pa.types.is_string(t) or pa.types.is_large_string(t)


def compute_stats(col: pa.ChunkedArray) -> dict[str, Any]:
    t = col.type
    n = len(col)
    null_count = col.null_count
    out: dict[str, Any] = {
        "kind": "other",
        "type": str(t),
        "count": n,
        "null_count": null_count,
        "non_null": n - null_count,
    }

    if n == 0 or n == null_count:
        return out

    try:
        if _is_bool(t):
            true_count = pc.sum(col).as_py() or 0
            false_count = (n - null_count) - true_count
            out.update(
                kind="bool",
                true_count=int(true_count),
                false_count=int(false_count),
            )
        elif _is_numeric(t):
            out.update(
                kind="numeric",
                min=_safe_py(pc.min(col)),
                max=_safe_py(pc.max(col)),
                mean=_safe_py(pc.mean(col)),
                stddev=_safe_py(pc.stddev(col, ddof=1)) if (n - null_count) > 1 else None,
                sum=_safe_py(pc.sum(col)),
            )
        elif _is_stringy(t):
            # value_counts; top 10
            vc = pc.value_counts(col)
            values = vc.field(0).to_pylist()
            counts = vc.field(1).to_pylist()
            paired = sorted(zip(values, counts), key=lambda x: -x[1])[:10]
            avg_len = _safe_py(pc.mean(pc.utf8_length(col))) if _is_stringy(t) else None
            out.update(
                kind="string",
                unique=len(values),
                top=[{"value": v, "count": c} for v, c in paired],
                avg_length=avg_len,
            )
        elif _is_temporal(t):
            out.update(
                kind="temporal",
                min=_safe_py(pc.min(col)),
                max=_safe_py(pc.max(col)),
            )
        else:
            # Fall back to value_counts for small unique sets
            try:
                vc = pc.value_counts(col)
                values = vc.field(0).to_pylist()
                counts = vc.field(1).to_pylist()
                paired = sorted(zip(values, counts), key=lambda x: -x[1])[:10]
                out.update(
                    kind="categorical",
                    unique=len(values),
                    top=[{"value": str(v), "count": c} for v, c in paired],
                )
            except Exception:
                pass
    except Exception as e:
        out["error"] = str(e)

    return out


def _safe_py(scalar) -> Any:
    try:
        v = scalar.as_py()
    except AttributeError:
        v = scalar
    # Make JSON-safe
    if hasattr(v, "isoformat"):
        return v.isoformat()
    return v
