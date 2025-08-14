import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import { db } from "~/lib/firebase";
import type { Stage } from "~/types";
import { retryWithBackoff } from "../utils/workflowUtils";

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

export function useWorkflowData() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [candidates, setCandidates] = useState<WorkflowCandidate[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to stages
  useEffect(() => {
    const q = query(collection(db, "stages"), orderBy("order", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setStages(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title,
              order: data.order,
              color: data.color,
            };
          })
        );
      },
      (error) => {
        console.error("Error subscribing to stages:", error);
        toast.error("Failed to load stages", {
          position: "bottom-right",
        });
      }
    );
    return () => unsub();
  }, []);

  // Subscribe to candidates
  useEffect(() => {
    const q = query(collection(db, "candidates"), orderBy("name", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCandidates(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<WorkflowCandidate, "id">),
          }))
        );
        setLoading(false);
      },
      (error) => {
        console.error("Error subscribing to candidates:", error);
        toast.error("Failed to load candidates", {
          position: "bottom-right",
        });
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const updateCandidateStage = async (
    candidateId: string,
    newStageId: string,
    stages: Stage[],
    candidates: WorkflowCandidate[]
  ) => {
    const sourceStage = stages.find((s) =>
      candidates.find((c) => c.id === candidateId && c.stageId === s.id)
    )?.title;
    const destStage = stages.find((s) => s.id === newStageId)?.title;
    const candidateName = candidates.find((c) => c.id === candidateId)?.name;

    try {
      await retryWithBackoff(async () => {
        await updateDoc(doc(db, "candidates", candidateId), {
          stageId: newStageId,
          updatedAt: new Date().toISOString(),
        });
      });

      if (sourceStage !== destStage) {
        toast.success(
          `Moved ${candidateName} from "${sourceStage}" to "${destStage}"`,
          {
            duration: 3000,
            position: "bottom-right",
          }
        );
      }
    } catch (error) {
      console.error("Error updating candidate stage:", error);
      toast.error("Failed to update candidate stage. Please try again.", {
        position: "bottom-right",
        action: {
          label: "Retry",
          onClick: () => updateCandidateStage(candidateId, newStageId, stages, candidates),
        },
      });
      throw error;
    }
  };

  return {
    stages,
    candidates,
    loading,
    updateCandidateStage,
  };
}
