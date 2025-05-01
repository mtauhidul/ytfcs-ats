// app/dashboard/candidates/columns.tsx
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

export type Candidate = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  tags: string[];
  category: string;
  rating: number;
  stageId: string;
  stageColor?: string;
  experience?: string;
  education?: string;
  skills?: string[];
  notes?: string;
  history?: { date: string; note: string }[];
  updatedAt?: string;
  onEdit?: (c: Candidate) => void;
};

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

// Function to display skills with hover tooltip for additional skills
const SkillsList = ({
  skills,
  limit = 3,
}: {
  skills: string[];
  limit?: number;
}) => {
  if (!skills || skills.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const displayedSkills = skills.slice(0, limit);
  const extraSkills = skills.length > limit ? skills.slice(limit) : [];

  return (
    <div className="flex flex-wrap gap-1 max-w-full">
      {displayedSkills.map((skill) => (
        <Badge
          key={skill}
          variant="outline"
          className="px-1.5 py-0 text-xs text-primary-700 bg-primary-50 border-primary-200 whitespace-nowrap"
        >
          {skill}
        </Badge>
      ))}

      {extraSkills.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="px-1.5 py-0 text-xs cursor-default"
              >
                +{extraSkills.length}
              </Badge>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="center"
              className="bg-white text-foreground border shadow-md p-2"
            >
              <div className="flex flex-wrap gap-1 max-w-[200px]">
                {extraSkills.map((skill) => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="px-1.5 py-0 text-xs whitespace-nowrap"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
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
  {
    accessorKey: "experience",
    header: "Experience",
    cell: ({ row }) => {
      const experience = row.original.experience;
      return (
        <div>
          {experience || <span className="text-muted-foreground">—</span>}
        </div>
      );
    },
    size: 120,
  },
  {
    accessorKey: "skills",
    header: "Skills",
    cell: ({ row }) => {
      const skills = row.original.skills || [];
      return <SkillsList skills={skills} />;
    },
    size: 240,
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="px-1.5 py-0 text-xs cursor-default"
                  >
                    +{tags.length - 2}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  align="center"
                  className="bg-white text-foreground border shadow-md p-2"
                >
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {tags.slice(2).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="px-1.5 py-0 text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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

      // Format date to be readable
      const date = new Date(updatedAt);
      const formatted = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);

      return <span className="text-sm text-muted-foreground">{formatted}</span>;
    },
    size: 120,
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => row.original.onEdit?.(row.original)}
        className="h-8 px-3 text-xs"
      >
        <Eye className="h-3.5 w-3.5 mr-1.5" />
        View
      </Button>
    ),
    size: 80,
  },
];
