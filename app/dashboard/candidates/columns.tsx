import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export type Candidate = {
  id: string;
  name: string;
  tags: string[];
  category: string;
  rating: number;
  stage: string;

  // Additional fields hidden by default on the table row
  experience?: string;
  education?: string;
  skills?: string[];
  notes?: string;
  history?: { date: string; note: string }[];
  // We'll store an onEdit callback to open the modal
  onEdit?: (candidate: Candidate) => void;
};

// Stage badge styling
const getStageBadgeStyles = (stage: string) => {
  switch (stage) {
    case "New":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Screening":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Interview":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "Offer":
      return "bg-green-100 text-green-800 border-green-200";
    case "Rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "Hired":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

// Rating stars component for the table
const RatingStars = ({ rating }: { rating: number }) => {
  return (
    <div className="flex">
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
};

export const columns: ColumnDef<Candidate>[] = [
  {
    accessorKey: "name",
    header: () => <div>Name</div>,
    cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
  },
  {
    accessorKey: "stage",
    header: () => <div>Stage</div>,
    cell: ({ row }) => {
      const stage = row.original.stage;
      return stage ? (
        <Badge
          variant="outline"
          className={cn(
            "font-normal whitespace-nowrap",
            getStageBadgeStyles(stage)
          )}
        >
          {stage}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "category",
    header: () => <div>Category</div>,
    cell: ({ row }) => (
      <div className="max-w-[180px] truncate">
        {row.original.category || (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "tags",
    header: () => <div>Tags</div>,
    cell: ({ row }) => {
      const tags = row.original.tags || [];
      if (tags.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }

      // Show up to 2 tags directly, then +X more
      return (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="px-1 py-0 text-xs">
              {tag}
            </Badge>
          ))}
          {tags.length > 2 && (
            <Badge variant="outline" className="px-1 py-0 text-xs">
              +{tags.length - 2}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "rating",
    header: () => <div>Rating</div>,
    cell: ({ row }) => <RatingStars rating={row.original.rating || 0} />,
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const candidate = row.original;
      return (
        <div className="text-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => candidate.onEdit?.(candidate)}
            className="h-8 px-2 text-xs"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            View
          </Button>
        </div>
      );
    },
  },
];
