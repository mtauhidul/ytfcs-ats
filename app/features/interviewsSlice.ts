// app/features/interviewsSlice.ts
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { Interview, InterviewFeedback } from "~/types";

interface InterviewsState {
  interviews: Interview[];
  feedbacks: InterviewFeedback[];
  selectedInterview: Interview | null;
  loading: boolean;
  error: string | null;
  filterStatus: string;
  filterOutcome: string;
}

const initialState: InterviewsState = {
  interviews: [],
  feedbacks: [],
  selectedInterview: null,
  loading: false,
  error: null,
  filterStatus: "all",
  filterOutcome: "all",
};

// Async thunks
export const fetchInterviews = createAsyncThunk(
  "interviews/fetchInterviews",
  async (candidateId?: string) => {
    let q = query(
      collection(db, "interviews"),
      orderBy("scheduledDate", "desc")
    );

    if (candidateId) {
      q = query(
        collection(db, "interviews"),
        where("candidateId", "==", candidateId),
        orderBy("scheduledDate", "desc")
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Interview[];
  }
);

export const fetchInterviewFeedbacks = createAsyncThunk(
  "interviews/fetchInterviewFeedbacks",
  async (interviewId?: string) => {
    let q = query(
      collection(db, "interviewFeedbacks"),
      orderBy("createdAt", "desc")
    );

    if (interviewId) {
      q = query(
        collection(db, "interviewFeedbacks"),
        where("interviewId", "==", interviewId)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as InterviewFeedback[];
  }
);

export const scheduleInterview = createAsyncThunk(
  "interviews/scheduleInterview",
  async (interviewData: Omit<Interview, "id" | "createdAt" | "updatedAt">) => {
    const docRef = await addDoc(collection(db, "interviews"), {
      ...interviewData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return {
      id: docRef.id,
      ...interviewData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Interview;
  }
);

export const updateInterviewStatus = createAsyncThunk(
  "interviews/updateInterviewStatus",
  async ({
    id,
    status,
    outcome,
  }: {
    id: string;
    status: Interview["status"];
    outcome?: Interview["outcome"];
  }) => {
    const interviewRef = doc(db, "interviews", id);
    const updateData: any = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (outcome) {
      updateData.outcome = outcome;
    }

    await updateDoc(interviewRef, updateData);
    return { id, status, outcome };
  }
);

export const submitInterviewFeedback = createAsyncThunk(
  "interviews/submitInterviewFeedback",
  async (
    feedbackData: Omit<InterviewFeedback, "id" | "createdAt" | "updatedAt">
  ) => {
    const docRef = await addDoc(collection(db, "interviewFeedbacks"), {
      ...feedbackData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return {
      id: docRef.id,
      ...feedbackData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as InterviewFeedback;
  }
);

export const interviewsSlice = createSlice({
  name: "interviews",
  initialState,
  reducers: {
    setInterviews: (state, action: PayloadAction<Interview[]>) => {
      state.interviews = action.payload;
    },
    setSelectedInterview: (state, action: PayloadAction<Interview | null>) => {
      state.selectedInterview = action.payload;
    },
    setFilterStatus: (state, action: PayloadAction<string>) => {
      state.filterStatus = action.payload;
    },
    setFilterOutcome: (state, action: PayloadAction<string>) => {
      state.filterOutcome = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch interviews
      .addCase(fetchInterviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInterviews.fulfilled, (state, action) => {
        state.loading = false;
        state.interviews = action.payload;
      })
      .addCase(fetchInterviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch interviews";
      })

      // Fetch feedbacks
      .addCase(fetchInterviewFeedbacks.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInterviewFeedbacks.fulfilled, (state, action) => {
        state.loading = false;
        state.feedbacks = action.payload;
      })
      .addCase(fetchInterviewFeedbacks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch feedbacks";
      })

      // Schedule interview
      .addCase(scheduleInterview.pending, (state) => {
        state.loading = true;
      })
      .addCase(scheduleInterview.fulfilled, (state, action) => {
        state.loading = false;
        state.interviews.unshift(action.payload);
      })
      .addCase(scheduleInterview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to schedule interview";
      })

      // Update interview status
      .addCase(updateInterviewStatus.fulfilled, (state, action) => {
        const { id, status, outcome } = action.payload;
        const interview = state.interviews.find((i) => i.id === id);
        if (interview) {
          interview.status = status;
          if (outcome) interview.outcome = outcome;
          interview.updatedAt = new Date().toISOString();
        }
      })

      // Submit feedback
      .addCase(submitInterviewFeedback.fulfilled, (state, action) => {
        state.feedbacks.unshift(action.payload);

        // Update interview with feedback ID
        const interview = state.interviews.find(
          (i) => i.id === action.payload.interviewId
        );
        if (interview) {
          interview.feedbackId = action.payload.id;
          interview.status = "completed";
        }
      });
  },
});

export const {
  setInterviews,
  setSelectedInterview,
  setFilterStatus,
  setFilterOutcome,
  clearError,
} = interviewsSlice.actions;

export default interviewsSlice.reducer;
