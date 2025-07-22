// app/dashboard/candidates/columns.tsx
import type { ColumnDef } from "@tanstack/react-table";
import { BadgeCheck, Eye } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { cn } from "~/lib/utils";
import type { Candidate } from "~/types";
import InterviewStatusIndicator from "./interview-status-indicator";

const RatingStars = ({ rating }: { rating: number }) => (
  <div className="flex justify-start">
    {[1, 2, 3, 4, 5].map((star) => (
      <svg
        key={star}
        xmlns="http://www.w3.org/2000/svg"
        className={`h-4 w-4 ${
          star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
        }`}
        viewBox="0 0 24 24"
      >
        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ))}
  </div>
);

// Resume Score component for the column
const ResumeScoreCell = ({ score }: { score?: number }) => {
  if (!score) {
    return <span className="text-muted-foreground">—</span>;
  }

  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-700 border-green-200";
    if (score >= 60) return "bg-blue-100 text-blue-700 border-blue-200";
    if (score >= 40) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={cn(
          "px-2 py-0.5 text-xs whitespace-nowrap",
          getScoreColor(score)
        )}
      >
        <BadgeCheck className="mr-1 h-3 w-3" />
        {Math.round(score)}%
      </Badge>
    </div>
  );
};

export const columns: ColumnDef<Candidate>[] = [
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
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
    size: 160,
  },
  {
    accessorKey: "stage",
    header: "Stage",
    cell: ({ row }) => {
      const stage = row.getValue<string>("stage");
      const colorClasses = row.original.stageColor;

      return stage ? (
        <Badge
          variant="outline"
          className={cn(
            "font-normal whitespace-nowrap py-0.5 px-2",
            colorClasses
          )}
        >
          {stage}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
    size: 120,
  },
  // New Resume Score column
  {
    accessorKey: "resumeScore",
    header: "Resume Score",
    cell: ({ row }) => {
      const score = row.original.resumeScore;
      return <ResumeScoreCell score={score} />;
    },
    size: 120,
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.original.category;
      return category ? (
        <Badge variant="outline" className="font-normal">
          {category}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
    size: 130,
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => {
      const tags = row.original.tags || [];
      if (!tags.length) {
        return <span className="text-muted-foreground">—</span>;
      }

      return (
        <div className="flex flex-wrap gap-1 max-w-[150px]">
          {tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="px-1.5 py-0 text-xs">
              {tag}
            </Badge>
          ))}
          {tags.length > 2 && (
            <Badge variant="outline" className="px-1.5 py-0 text-xs">
              +{tags.length - 2}
            </Badge>
          )}
        </div>
      );
    },
    size: 150,
  },
  {
    accessorKey: "rating",
    header: "Rating",
    cell: ({ row }) => {
      const rating =
        typeof row.original.rating === "number" ? row.original.rating : 0;
      return <RatingStars rating={rating} />;
    },
    size: 120,
  },
  {
    accessorKey: "updatedAt",
    header: "Last Update",
    cell: ({ row }) => {
      const updatedAt = row.original.updatedAt;
      if (!updatedAt) return <span className="text-muted-foreground">—</span>;

      try {
        // Format date to be readable - with error handling
        const date = new Date(updatedAt);

        // Check if date is valid
        if (isNaN(date.getTime())) {
          return <span className="text-muted-foreground">Invalid date</span>;
        }

        const formatted = new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(date);

        return (
          <span className="text-sm text-muted-foreground">{formatted}</span>
        );
      } catch (error) {
        console.error("Error formatting date:", error);
        return <span className="text-muted-foreground">Invalid date</span>;
      }
    },
    size: 120,
  },
  {
    accessorKey: "interviewHistory",
    header: "Interviews",
    cell: ({ row }) => {
      return <InterviewStatusIndicator candidate={row.original} />;
    },
    size: 100,
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => row.original.onEdit?.(row.original)}
        className="h-8 px-3 text-xs"
      >
        <Eye className="h-3.5 w-3.5 mr-1.5" />
        Details
      </Button>
    ),
    size: 80,
  },
];
