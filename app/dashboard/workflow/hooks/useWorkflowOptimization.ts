import { useCallback, useMemo } from "react";
import type { Stage } from "~/types";

// Local candidate type to match existing workflow structure
type WorkflowCandidate = {
  id: string;
  name: string;
  stageId: string;
  tags?: string[];
  rating?: number;
  updatedAt?: string;
  company?: string;
  position?: string;
  reviewers?: string[];
};

interface UseWorkflowOptimizationProps {
  candidates: WorkflowCandidate[];
  stages: Stage[];
  searchQuery: string;
}

export function useWorkflowOptimization({
  candidates,
  stages,
  searchQuery,
}: UseWorkflowOptimizationProps) {
  // Memoized filtered candidates
  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    
    return candidates.filter((candidate) =>
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [candidates, searchQuery]);

  // Memoized function to get candidates for a stage
  const getCandidatesForStage = useCallback(
    (stageId: string) => {
      return filteredCandidates.filter((c) => c.stageId === stageId);
    },
    [filteredCandidates]
  );

  // Memoized stage statistics
  const stageStats = useMemo(() => {
    return stages.reduce((acc, stage) => {
      acc[stage.id] = getCandidatesForStage(stage.id).length;
      return acc;
    }, {} as Record<string, number>);
  }, [stages, getCandidatesForStage]);

  // Memoized board header color calculation
  const getBoardHeaderColor = useCallback((color: string) => {
    if (!color) return "bg-zinc-100 dark:bg-zinc-800";

    const bgClass = color.split(" ")[0];

    if (bgClass && bgClass.startsWith("bg-")) {
      return bgClass;
    }

    const colorMatch = color.match(/(?:bg|border|text)-([a-z]+)-\d+/);
    if (colorMatch && colorMatch[1]) {
      return `bg-${colorMatch[1]}-100`;
    }

    return "bg-zinc-100";
  }, []);

  return {
    filteredCandidates,
    getCandidatesForStage,
    stageStats,
    getBoardHeaderColor,
  };
}
