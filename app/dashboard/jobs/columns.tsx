// app/dashboard/jobs/columns.tsx
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import type { Job } from "~/types";

export const columns: ColumnDef<Job>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "jobId",
    header: "ID",
    cell: ({ row }) => {
      const jobId = row.original.jobId;
      return jobId ? (
        <div className="font-mono text-xs bg-muted/50 px-1.5 py-1 rounded text-center min-w-fit max-w-[70px]">
          <span className="hidden lg:inline">{jobId}</span>
          <span className="lg:hidden">{jobId.split("-")[0]}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      );
    },
    size: 70,
    meta: {
      className: "hidden sm:table-cell", // Hide on mobile to save space
    },
  },
  {
    accessorKey: "title",
    header: "Job Title",
    cell: ({ row }) => (
      <div className="font-medium min-w-0">
        <div
          className="truncate text-sm leading-tight"
          title={row.getValue("title")}
        >
          {row.getValue("title")}
        </div>
        {row.original.department && (
          <div className="text-xs text-muted-foreground mt-1 truncate">
            {row.original.department}
          </div>
        )}
      </div>
    ),
    size: 200,
    minSize: 150,
  },
  {
    accessorKey: "clientName",
    header: "Client",
    cell: ({ row }) => {
      const clientName = row.original.clientName;
      const clientCompany = row.original.clientCompany;
      
      return (
        <div className="min-w-0 max-w-[140px]">
          {clientName ? (
            <div>
              <div className="font-medium text-xs truncate" title={clientName}>
                {clientName}
              </div>
              {clientCompany && (
                <div className="text-xs text-muted-foreground truncate" title={clientCompany}>
                  {clientCompany}
                </div>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </div>
      );
    },
    size: 140,
    meta: {
      className: "hidden sm:table-cell", // Hide on mobile to save space
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue<string>("status");
      const colorClasses = row.original.statusColor;

      return status ? (
        <Badge
          variant="outline"
          className={cn(
            "font-normal whitespace-nowrap py-1 px-2 text-xs max-w-[100px] truncate",
            colorClasses
          )}
        >
          <span className="hidden md:inline">{status}</span>
          <span className="md:hidden">
            {status.length > 6 ? `${status.substring(0, 6)}...` : status}
          </span>
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="text-muted-foreground text-xs py-1 px-2"
        >
          <span className="hidden md:inline">Unassigned</span>
          <span className="md:hidden">—</span>
        </Badge>
      );
    },
    size: 100,
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => {
      const location = row.original.location;
      const employmentType = row.original.employmentType;

      return (
        <div className="min-w-0 max-w-[140px]">
          <div className="truncate text-xs" title={location}>
            {location || <span className="text-muted-foreground">—</span>}
          </div>
          {employmentType && (
            <Badge
              variant="secondary"
              className="text-xs mt-1 capitalize px-1.5 py-0 max-w-full truncate"
            >
              <span className="hidden sm:inline">
                {employmentType.replace("-", " ")}
              </span>
              <span className="sm:hidden">
                {employmentType.split("-")[0].substring(0, 4)}
              </span>
            </Badge>
          )}
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: "salaryRange",
    header: "Salary",
    cell: ({ row }) => {
      const salary = row.original.salaryRange;
      return (
        <div
          className="text-xs font-medium min-w-0 max-w-[90px] truncate"
          title={salary}
        >
          {salary ? (
            <>
              <span className="hidden xl:inline">{salary}</span>
              <span className="xl:hidden">
                {salary.includes("-")
                  ? `${salary.split("-")[0].trim()}+`
                  : salary.length > 6
                  ? `${salary.substring(0, 6)}...`
                  : salary}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      );
    },
    size: 90,
    meta: {
      className: "hidden md:table-cell", // Hide on mobile to save space
    },
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = row.original.tags || [];
      if (!tags.length) {
        return <span className="text-muted-foreground text-xs">—</span>;
      }

      // More aggressive responsive tag display
      const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
      const isTablet =
        typeof window !== "undefined" && window.innerWidth < 1024;

      // Show fewer tags on smaller screens to save space
      const maxTags = isMobile ? 1 : isTablet ? 1 : 2;
      const displayedTags = tags.slice(0, maxTags);
      const extraCount = tags.length - displayedTags.length;

      return (
        <div
          className="flex flex-wrap gap-0.5 min-w-0 max-w-[100px]"
          title={tags.join(", ")}
        >
          {displayedTags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="px-1 py-0 text-xs max-w-full truncate"
            >
              <span className="hidden lg:inline">
                {tag.length > 8 ? `${tag.substring(0, 8)}...` : tag}
              </span>
              <span className="lg:hidden">
                {tag.length > 3 ? `${tag.substring(0, 3)}...` : tag}
              </span>
            </Badge>
          ))}
          {extraCount > 0 && (
            <Badge
              variant="outline"
              className="px-1 py-0 text-xs text-muted-foreground"
            >
              +{extraCount}
            </Badge>
          )}
        </div>
      );
    },
    size: 100,
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => {
      const updatedAt = row.original.updatedAt;
      if (!updatedAt)
        return <span className="text-muted-foreground text-xs">—</span>;

      try {
        const date = new Date(updatedAt);
        if (isNaN(date.getTime())) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }

        const now = new Date();
        const diffInDays = Math.floor(
          (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffInDays === 0) {
          return (
            <span className="text-xs text-green-600 font-medium">
              <span className="hidden lg:inline">Today</span>
              <span className="lg:hidden">Now</span>
            </span>
          );
        } else if (diffInDays === 1) {
          return (
            <span className="text-xs text-blue-600">
              <span className="hidden lg:inline">Yesterday</span>
              <span className="lg:hidden">1d</span>
            </span>
          );
        } else if (diffInDays < 7) {
          return (
            <span className="text-xs text-muted-foreground">{diffInDays}d</span>
          );
        } else {
          const formatted = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
          }).format(date);
          return (
            <span className="text-xs text-muted-foreground">
              <span className="hidden lg:inline">{formatted}</span>
              <span className="lg:hidden">{formatted.split(" ")[1]}</span>
            </span>
          );
        }
      } catch (error) {
        return <span className="text-muted-foreground text-xs">—</span>;
      }
    },
    size: 80,
    meta: {
      className: "hidden lg:table-cell", // Hide on mobile/tablet to save space
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => row.original.onEdit?.(row.original)}
        className="h-8 px-2 text-xs hover:bg-primary/10 shrink-0"
      >
        <Eye className="h-3.5 w-3.5 lg:mr-1.5" />
        <span className="hidden lg:inline">View</span>
      </Button>
    ),
    size: 60,
  },
];
