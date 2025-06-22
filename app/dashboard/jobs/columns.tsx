// app/dashboard/jobs/columns.tsx
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";

export type Job = {
  id: string;
  jobId?: string; // Custom job ID
  title: string;
  description?: string;
  requirements?: string[];
  location?: string;
  salaryRange?: string;
  department?: string;
  employmentType?: string;
  tags: string[];
  category: string;
  statusId: string;
  statusColor?: string;
  history?: { date: string; note: string }[];
  createdAt?: string;
  updatedAt?: string;
  onEdit?: (j: Job) => void;
};

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
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "jobId",
    header: "Job ID",
    cell: ({ row }) => {
      const jobId = row.original.jobId;
      return jobId ? (
        <div className="font-mono text-sm bg-muted/50 px-2 py-1 rounded text-center min-w-fit">
          {jobId}
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      );
    },
    size: 140,
  },
  {
    accessorKey: "title",
    header: "Job Title",
    cell: ({ row }) => (
      <div className="font-medium max-w-[250px]">
        <div className="truncate" title={row.getValue("title")}>
          {row.getValue("title")}
        </div>
        {row.original.department && (
          <div className="text-xs text-muted-foreground mt-1">
            {row.original.department}
          </div>
        )}
      </div>
    ),
    size: 250,
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
            "font-normal whitespace-nowrap py-1 px-3",
            colorClasses
          )}
        >
          {status}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Unassigned
        </Badge>
      );
    },
    size: 120,
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => {
      const location = row.original.location;
      const employmentType = row.original.employmentType;

      return (
        <div className="max-w-[180px]">
          <div className="truncate text-sm" title={location}>
            {location || <span className="text-muted-foreground">—</span>}
          </div>
          {employmentType && (
            <Badge variant="secondary" className="text-xs mt-1 capitalize">
              {employmentType.replace("-", " ")}
            </Badge>
          )}
        </div>
      );
    },
    size: 180,
  },
  {
    accessorKey: "salaryRange",
    header: "Salary",
    cell: ({ row }) => {
      const salary = row.original.salaryRange;
      return (
        <div
          className="text-sm font-medium max-w-[140px] truncate"
          title={salary}
        >
          {salary || <span className="text-muted-foreground">—</span>}
        </div>
      );
    },
    size: 140,
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = row.original.tags || [];
      if (!tags.length) {
        return <span className="text-muted-foreground text-sm">—</span>;
      }

      const displayedTags = tags.slice(0, 2);
      const extraCount = tags.length - 2;

      return (
        <div className="flex flex-wrap gap-1 max-w-[160px]">
          {displayedTags.map((tag) => (
            <Badge key={tag} variant="outline" className="px-2 py-0 text-xs">
              {tag}
            </Badge>
          ))}
          {extraCount > 0 && (
            <Badge variant="outline" className="px-2 py-0 text-xs">
              +{extraCount}
            </Badge>
          )}
        </div>
      );
    },
    size: 160,
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    cell: ({ row }) => {
      const updatedAt = row.original.updatedAt;
      if (!updatedAt) return <span className="text-muted-foreground">—</span>;

      try {
        const date = new Date(updatedAt);
        if (isNaN(date.getTime())) {
          return <span className="text-muted-foreground">—</span>;
        }

        const now = new Date();
        const diffInDays = Math.floor(
          (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffInDays === 0) {
          return (
            <span className="text-sm text-green-600 font-medium">Today</span>
          );
        } else if (diffInDays === 1) {
          return <span className="text-sm text-blue-600">Yesterday</span>;
        } else if (diffInDays < 7) {
          return (
            <span className="text-sm text-muted-foreground">
              {diffInDays}d ago
            </span>
          );
        } else {
          const formatted = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
          }).format(date);
          return (
            <span className="text-sm text-muted-foreground">{formatted}</span>
          );
        }
      } catch (error) {
        return <span className="text-muted-foreground">—</span>;
      }
    },
    size: 100,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => row.original.onEdit?.(row.original)}
        className="h-8 px-3 text-xs hover:bg-primary/10"
      >
        <Eye className="h-3.5 w-3.5 mr-1.5" />
        View
      </Button>
    ),
    size: 80,
  },
];
