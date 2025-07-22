// app/store/candidateStore.ts
import { create } from "zustand";
import type { Candidate, Stage } from "~/types";

interface CandidateStore {
  // State
  candidates: Candidate[];
  stages: Stage[];
  selectedCandidates: string[];
  detailCandidate: Candidate | null;
  loading: boolean;

  // Actions
  setCandidates: (candidates: Candidate[]) => void;
  setStages: (stages: Stage[]) => void;
  setSelectedCandidates: (ids: string[]) => void;
  setDetailCandidate: (candidate: Candidate | null) => void;
  setLoading: (loading: boolean) => void;

  // Computed
  getSelectedCandidates: () => Candidate[];
  getCandidatesByStage: (stageId: string) => Candidate[];
}

export const useCandidateStore = create<CandidateStore>((set, get) => ({
  // Initial state
  candidates: [],
  stages: [],
  selectedCandidates: [],
  detailCandidate: null,
  loading: true,

  // Actions
  setCandidates: (candidates) => set({ candidates }),
  setStages: (stages) => set({ stages }),
  setSelectedCandidates: (selectedCandidates) => set({ selectedCandidates }),
  setDetailCandidate: (detailCandidate) => set({ detailCandidate }),
  setLoading: (loading) => set({ loading }),

  // Computed selectors
  getSelectedCandidates: () => {
    const { candidates, selectedCandidates } = get();
    return candidates.filter((c) => selectedCandidates.includes(c.id));
  },

  getCandidatesByStage: (stageId: string) => {
    const { candidates } = get();
    return candidates.filter((c) => c.stageId === stageId);
  },
}));
