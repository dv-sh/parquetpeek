import { useState } from "react";

const COLLAPSED_CHARS = 200;

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export function Cell({ value, wrap }: { value: unknown; wrap: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (value === null || value === undefined) {
    return <span className="italic text-paper-400 dark:text-plum-300">—</span>;
  }

  const isObj = typeof value === "object";
  const text = formatValue(value);
  const long = text.length > COLLAPSED_CHARS;
  const display = !expanded && long ? text.slice(0, COLLAPSED_CHARS) + "…" : text;

  const baseCls = isObj
    ? "font-mono text-xs"
    : typeof value === "number"
      ? "tabular-nums text-right"
      : typeof value === "boolean"
        ? value
          ? "text-sage-600 dark:text-sage-400 font-medium"
          : "text-brick-500 dark:text-brick-400 font-medium"
        : "";

  return (
    <div
      className={`${baseCls} ${wrap ? "whitespace-pre-wrap break-words" : "whitespace-nowrap overflow-hidden text-ellipsis"} leading-relaxed`}
      title={!wrap && long ? text : undefined}
    >
      {display}
      {long && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="ml-2 text-xs font-medium text-clay-500 hover:text-clay-600 hover:underline underline-offset-2"
        >
          {expanded ? "less" : "more"}
        </button>
      )}
    </div>
  );
}
