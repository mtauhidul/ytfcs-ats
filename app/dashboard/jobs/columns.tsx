// app/dashboard/jobs/columns.tsx
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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
      const clientLogoUrl = row.original.clientLogoUrl;
      
      return (
        <div className="flex items-center gap-2 min-w-0 max-w-[160px]">
          {clientLogoUrl ? (
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage 
                src={clientLogoUrl} 
                alt={clientName || clientCompany || "Client logo"} 
              />
              <AvatarFallback className="text-xs">
                {(clientName || clientCompany)?.slice(0, 2)?.toUpperCase() || "CL"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="text-xs">
                {(clientName || clientCompany)?.slice(0, 2)?.toUpperCase() || "CL"}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
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
        </div>
      );
    },
    size: 160,
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
    accessorKey: "createdAt",
    header: "Date Posted",
    cell: ({ row }) => {
      const createdAt = row.original.createdAt;
      if (!createdAt) {
        return <span className="text-muted-foreground text-xs">—</span>;
      }

      // Format the date
      const date = new Date(createdAt);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return <span className="text-muted-foreground text-xs">Invalid date</span>;
      }
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let displayText = "";
      if (diffDays === 1) {
        displayText = "Today";
      } else if (diffDays === 2) {
        displayText = "Yesterday";
      } else if (diffDays <= 7) {
        displayText = `${diffDays - 1}d ago`;
      } else if (diffDays <= 30) {
        displayText = `${Math.floor((diffDays - 1) / 7)}w ago`;
      } else {
        displayText = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      }

      return (
        <div className="text-xs text-muted-foreground min-w-[60px]" title={date.toLocaleDateString()}>
          {displayText}
        </div>
      );
    },
    size: 80,
    meta: {
      className: "hidden md:table-cell", // Hide on smaller screens
    },
  },
  {
    id: "actions",
    header: "Details",
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
