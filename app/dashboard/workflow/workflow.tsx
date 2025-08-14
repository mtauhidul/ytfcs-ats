"use client";

import {
  DragDropContext,
  type DropResult,
} from "@hello-pangea/dnd";
import { useRef, useState } from "react";
import { Toaster } from "sonner";

import { WorkflowErrorBoundary } from "./components/WorkflowErrorBoundary";
import { WorkflowLoadingState } from "./components/WorkflowLoadingState";
import { EmptyStagesState } from "./components/EmptyStagesState";
import { WorkflowHeader } from "./components/WorkflowHeader";
import { StageColumn } from "./components/StageColumn";
import { AutomationDialog } from "./components/AutomationDialog";
import { useWorkflowData } from "./hooks/useWorkflowData";
import { useWorkflowOptimization } from "./hooks/useWorkflowOptimization";
import { useDragScroll } from "./hooks/useDragScroll";
import { usePerformanceMonitoring } from "./hooks/usePerformanceMonitoring";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";

export default function WorkflowPage() {
  const { stages, candidates, loading, updateCandidateStage } = useWorkflowData();
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [openAutomationFor, setOpenAutomationFor] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Refs for accessibility
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { boardRef } = useDragScroll(isDragging);
  
  const {
    filteredCandidates,
    getCandidatesForStage,
    getBoardHeaderColor,
  } = useWorkflowOptimization({
    candidates,
    stages,
    searchQuery,
  });

  // Performance monitoring (enabled in development)
  usePerformanceMonitoring(
    candidates.length,
    stages.length,
    process.env.NODE_ENV === "development"
  );

  // Keyboard navigation
  useKeyboardNavigation({
    onSearch: () => {
      searchInputRef.current?.focus();
    },
    onEscape: () => {
      if (openAutomationFor) {
        setOpenAutomationFor(null);
      } else if (searchQuery) {
        setSearchQuery("");
      }
    },
    onRefresh: () => {
      // Refresh is handled automatically by Firebase listeners
      console.log("Data refreshed automatically via Firebase listeners");
    },
    enabled: !loading,
  });

  // Handle drag-and-drop events
  const onDragEnd = async (result: DropResult) => {
    setIsDragging(false);

    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    try {
      await updateCandidateStage(
        draggableId,
        destination.droppableId,
        stages,
        candidates
      );
    } catch (error) {
      // Error handling is done in the hook
      console.error("Drag and drop failed:", error);
    }
  };

  const onDragStart = () => {
    setIsDragging(true);
  };

  const handleAutomationClick = (stage: { id: string; title: string }) => {
    setOpenAutomationFor(stage);
  };

  const handleAutomationClose = () => {
    setOpenAutomationFor(null);
  };

  return (
    <WorkflowErrorBoundary>
      {/* Render loading state */}
      {loading && <WorkflowLoadingState />}

      {/* Render empty state */}
      {!loading && !stages.length && <EmptyStagesState />}

      {/* Render main workflow */}
      {!loading && stages.length > 0 && (
        <div className="flex-grow overflow-hidden p-2">
          <Toaster />

          {/* Header */}
          <WorkflowHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            candidatesCount={candidates.length}
            searchInputRef={searchInputRef}
          />

          {/* Kanban Board */}
          <div
            ref={boardRef}
            className="overflow-x-auto overflow-y-hidden pb-4 max-w-[78vw] h-[calc(100vh-200px)]"
          >
            <div className="flex gap-4 min-w-[100vw]">
              <DragDropContext onDragEnd={onDragEnd} onDragStart={onDragStart}>
                {stages.map((stage) => {
                  const stageItems = getCandidatesForStage(stage.id);

                  return (
                    <StageColumn
                      key={stage.id}
                      stage={stage}
                      candidates={stageItems}
                      isDragging={isDragging}
                      onAutomationClick={handleAutomationClick}
                      getBoardHeaderColor={getBoardHeaderColor}
                    />
                  );
                })}
              </DragDropContext>
            </div>
          </div>

          {/* Stage Automations Dialog */}
          <AutomationDialog
            isOpen={Boolean(openAutomationFor)}
            onClose={handleAutomationClose}
            stageTitle={openAutomationFor?.title}
          />
        </div>
      )}
    </WorkflowErrorBoundary>
  );
}
