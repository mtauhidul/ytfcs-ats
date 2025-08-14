import { LayersIcon, Search, X } from "lucide-react";
import { forwardRef } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

interface WorkflowHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  candidatesCount: number;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export const WorkflowHeader = forwardRef<HTMLDivElement, WorkflowHeaderProps>(
  ({ searchQuery, setSearchQuery, candidatesCount, searchInputRef }, ref) => {
    return (
      <div
        ref={ref}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6"
      >
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <LayersIcon className="size-5" />
            Application Workflow
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Drag candidates between stages to update their status
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-[400px]">
          {/* Search input */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search candidates... (Press / to focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9"
              aria-label="Search candidates"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Badge
            variant="secondary"
            className="text-xs py-1 h-9 px-3 flex items-center"
            aria-label={`${candidatesCount} candidates total`}
          >
            {candidatesCount} candidates
          </Badge>
        </div>
      </div>
    );
  }
);

WorkflowHeader.displayName = "WorkflowHeader";
