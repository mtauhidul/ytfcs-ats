"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";

interface ExtendedColumnMeta {
  thClass?: string;
  tdClass?: string;
}

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData, TValue> extends ExtendedColumnMeta {}
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
}

export function DataTable<TData>({ columns, data }: DataTableProps<TData>) {
  // Set up TanStack Table
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    // Outer container with potential horizontal scroll if truly needed
    <div className="w-full overflow-x-auto border rounded-md">
      {/* `table-fixed w-full` is crucial for respecting our fixed widths */}
      <Table className="table-fixed w-full text-sm">
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const colDef = header.column.columnDef;
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "px-2 py-2 font-semibold",
                      // apply custom width or classes from meta
                      colDef.meta?.thClass
                    )}
                  >
                    {!header.isPlaceholder &&
                      flexRender(colDef.header, header.getContext())}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const colDef = cell.column.columnDef;
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "px-2 py-2 align-top",
                        colDef.meta?.tdClass
                      )}
                    >
                      {flexRender(colDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-4">
                No data found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
