import { Droppable } from "@hello-pangea/dnd";
import { BellIcon, MoreHorizontal, UserIcon } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import type { Stage } from "~/types";
import { CandidateCard } from "./CandidateCard";

interface StageColumnProps {
  stage: Stage;
  candidates: any[];
  isDragging: boolean;
  onAutomationClick: (stage: { id: string; title: string }) => void;
  getBoardHeaderColor: (color: string) => string;
}

export function StageColumn({
  stage,
  candidates,
  isDragging,
  onAutomationClick,
  getBoardHeaderColor,
}: StageColumnProps) {
  const headerBgClass = getBoardHeaderColor(stage.color);

  return (
    <div className="w-full min-w-[280px] md:min-w-[320px]">
      <Droppable droppableId={stage.id}>
        {(droppableProvided, snapshot) => (
          <div
            className={cn(
              "flex flex-col rounded-lg border shadow-sm h-[calc(100vh-200px)] bg-card",
              snapshot.isDraggingOver && "ring-2 ring-primary/50"
            )}
            role="region"
            aria-label={`${stage.title} stage with ${candidates.length} candidates`}
          >
            {/* Stage Header */}
            <div
              className={cn(
                "p-3 text-center font-medium rounded-t-lg flex items-center justify-between",
                headerBgClass
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{stage.title}</span>
                <Badge
                  variant="secondary"
                  className="h-5 text-xs px-2 bg-white/70"
                >
                  {candidates.length}
                </Badge>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() =>
                    onAutomationClick({
                      id: stage.id,
                      title: stage.title,
                    })
                  }
                >
                  <BellIcon className="size-3" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreHorizontal className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Configure automations</DropdownMenuItem>
                    <DropdownMenuItem>Manage stage</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Candidates List */}
            <div
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
              className="flex-1 overflow-y-auto p-2 space-y-2"
              style={{
                maxHeight: "calc(100vh - 300px)",
                overflowY: "auto",
              }}
            >
              {candidates.length === 0 && !snapshot.isDraggingOver && (
                <div className="flex flex-col items-center justify-center text-center py-8 text-sm text-muted-foreground bg-muted/10 rounded-md">
                  <UserIcon className="size-6 mb-2 opacity-40" />
                  <p>No candidates</p>
                  {isDragging && (
                    <p className="text-xs mt-1">
                      Drop here to move to {stage.title}
                    </p>
                  )}
                </div>
              )}

              {candidates.map((candidate, idx) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  index={idx}
                />
              ))}

              {droppableProvided.placeholder}
            </div>

            {/* Stage Footer */}
            <div className="p-2 border-t text-xs text-muted-foreground text-center bg-muted/20">
              {isDragging && snapshot.isDraggingOver ? (
                <div className="font-medium text-primary">
                  Drop to move to {stage.title}
                </div>
              ) : (
                <div>
                  {candidates.length}{" "}
                  {candidates.length === 1 ? "candidate" : "candidates"}
                </div>
              )}
            </div>
          </div>
        )}
      </Droppable>
    </div>
  );
}
