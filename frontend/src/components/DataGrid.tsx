import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Cell } from "./Cell";
import type { ColumnInfo } from "../api";

type Row = Record<string, unknown>;

export interface DataGridProps {
  columns: ColumnInfo[];
  rows: Row[];
  totalRows: number;
  loading?: boolean;
  wrapText: boolean;
  onColumnClick?: (name: string) => void;
  activeColumn?: string | null;
  loadMore?: () => void;
  canLoadMore?: boolean;
}

export function DataGrid({
  columns,
  rows,
  totalRows,
  loading,
  wrapText,
  onColumnClick,
  activeColumn,
  loadMore,
  canLoadMore,
}: DataGridProps) {
  const tableCols = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "__idx",
        header: "#",
        size: 60,
        cell: ({ row }) => (
          <span className="text-paper-400 dark:text-plum-300 text-xs tabular-nums">{row.index + 1}</span>
        ),
      },
      ...columns.map<ColumnDef<Row>>((c) => ({
        id: c.name,
        header: c.name,
        accessorFn: (r) => r[c.name],
        size: 220,
        cell: ({ getValue }) => <Cell value={getValue() as unknown} wrap={wrapText} />,
        meta: { type: c.type },
      })),
    ],
    [columns, wrapText]
  );

  const table = useReactTable({
    data: rows,
    columns: tableCols,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
    defaultColumn: { minSize: 60, maxSize: 1200 },
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const [estimateSize, setEstimateSize] = useState(wrapText ? 60 : 36);
  useEffect(() => setEstimateSize(wrapText ? 60 : 36), [wrapText]);

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 12,
  });

  useEffect(() => {
    const el = parentRef.current;
    if (!el || !loadMore || !canLoadMore) return;
    const onScroll = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 400) {
        loadMore();
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [loadMore, canLoadMore, rows.length]);

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  return (
    <div
      ref={parentRef}
      className="relative h-full w-full overflow-auto border-t border-paper-200 dark:border-plum-600"
    >
      <table className="w-max min-w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-paper-100/95 dark:bg-plum-700/95 backdrop-blur shadow-sm">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => {
                const isActive = activeColumn === h.column.id;
                const colMeta = (h.column.columnDef.meta as { type?: string } | undefined);
                const isIdx = h.column.id === "__idx";
                return (
                  <th
                    key={h.id}
                    style={{ width: h.getSize() }}
                    className={`group relative border-b border-r border-paper-200 dark:border-plum-600 px-3 py-2.5 text-left align-top
                      ${isActive ? "bg-clay-500/10" : ""}
                      ${isIdx ? "" : "cursor-pointer hover:bg-paper-200/60 dark:hover:bg-plum-600/60"}`}
                    onClick={() => !isIdx && onColumnClick?.(h.column.id)}
                  >
                    <div className="flex flex-col">
                      <span className="font-display font-semibold text-paper-800 dark:text-paper-50">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </span>
                      {colMeta?.type && (
                        <span className="text-[10px] uppercase tracking-widest text-paper-400 dark:text-plum-300 font-mono">
                          {colMeta.type}
                        </span>
                      )}
                    </div>
                    {!isIdx && (
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          h.getResizeHandler()(e);
                        }}
                        onTouchStart={h.getResizeHandler()}
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none
                          opacity-0 group-hover:opacity-100 hover:bg-clay-500 ${h.column.getIsResizing() ? "bg-clay-500 opacity-100" : ""}`}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr>
              <td style={{ height: paddingTop }} colSpan={tableCols.length} />
            </tr>
          )}
          {virtualRows.map((vr) => {
            const row = table.getRowModel().rows[vr.index];
            const zebra = vr.index % 2 === 1;
            return (
              <tr
                key={row.id}
                className={`border-b border-paper-100 dark:border-plum-700/60 transition-colors
                  ${zebra ? "bg-paper-50/40 dark:bg-plum-800/30" : ""}
                  hover:bg-clay-500/5 dark:hover:bg-clay-500/10`}
              >
                {row.getVisibleCells().map((cell) => {
                  const isActive = activeColumn === cell.column.id;
                  return (
                    <td
                      key={cell.id}
                      style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}
                      className={`border-r border-paper-100 dark:border-plum-700/60 px-3 py-2 align-top
                        ${isActive ? "bg-clay-500/5" : ""}`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {paddingBottom > 0 && (
            <tr>
              <td style={{ height: paddingBottom }} colSpan={tableCols.length} />
            </tr>
          )}
        </tbody>
      </table>
      {loading && (
        <div className="sticky bottom-0 left-0 right-0 border-t border-paper-200 dark:border-plum-600 bg-paper-100/95 dark:bg-plum-700/95 backdrop-blur px-3 py-2 text-xs italic text-paper-500 dark:text-plum-300">
          fetching more rows…
        </div>
      )}
      {!loading && rows.length === 0 && (
        <div className="p-12 text-center font-display italic text-paper-400 dark:text-plum-300">nothing here yet</div>
      )}
      {!canLoadMore && rows.length > 0 && rows.length === totalRows && (
        <div className="p-4 text-center font-display italic text-xs text-paper-400 dark:text-plum-300">
          end of file · {totalRows.toLocaleString()} rows
        </div>
      )}
    </div>
  );
}
