// app/features/candidateImportSlice.ts

import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import axios from "axios";

type CandidateData = {
  name: string;
  experience: string;
  education: string;
  skills: string[];

  // Additional fields for future use, defaulting them in Firestore
  stage?: string; // e.g., "Applied", "Screening", "Interview", etc.
  tags?: string[]; // user-defined tags
  category?: string; // user-defined category
  rating?: number; // e.g. 0–5
  notes?: string; // free text notes
  history?: { date: string; note: string }[];
};

interface CandidateImportState {
  parsedData: Partial<CandidateData> | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: CandidateImportState = {
  parsedData: null,
  status: "idle",
  error: null,
};

export const parseResume = createAsyncThunk(
  "candidateImport/parseResume",
  async (file: File, { rejectWithValue }) => {
    try {
      const AFFINDA_API_KEY = import.meta.env.VITE_AFFINDA_API_KEY;
      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        "https://api.affinda.com/v2/resumes/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Accept: "application/json",
            Authorization: `Bearer ${AFFINDA_API_KEY}`,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      let message = error.message || "Unknown error";
      if (error.response?.data && typeof error.response.data === "object") {
        message = JSON.stringify(error.response.data);
      }
      return rejectWithValue(message);
    }
  }
);

export const candidateImportSlice = createSlice({
  name: "candidateImport",
  initialState,
  reducers: {
    resetImport: (state) => {
      state.parsedData = null;
      state.status = "idle";
      state.error = null;
    },
    updateParsedData: (
      state,
      action: PayloadAction<Partial<CandidateData>>
    ) => {
      state.parsedData = {
        ...state.parsedData,
        ...action.payload,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(parseResume.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(parseResume.fulfilled, (state, action) => {
        state.status = "succeeded";
        const affindaData = action.payload?.data || {};

        // Basic fields
        let candidateName = "";
        if (typeof affindaData.name === "object") {
          candidateName = affindaData.name.raw || "No Name";
        } else if (typeof affindaData.name === "string") {
          candidateName = affindaData.name;
        }
        const yrs = affindaData.totalYearsExperience;
        const candidateExperience =
          typeof yrs === "number" ? `${yrs} years` : "";

        let candidateEducation = "";
        if (Array.isArray(affindaData.education)) {
          candidateEducation = affindaData.education
            .map((ed: any) => {
              const degree = ed.accreditation?.education || "Unknown Degree";
              const org = ed.organization || "Unknown Institution";
              const date = ed.dates?.rawText || "";
              return `${degree} at ${org} (${date})`;
            })
            .join("; ");
        }
        const certifications = Array.isArray(affindaData.certifications)
          ? affindaData.certifications
          : [];
        const skillObjs = Array.isArray(affindaData.skills)
          ? affindaData.skills.map((sk: any) => sk.name || "")
          : [];
        const combinedSkills = [...certifications, ...skillObjs].filter(
          Boolean
        );

        // Initialize extra fields with defaults
        state.parsedData = {
          name: candidateName,
          experience: candidateExperience,
          education: candidateEducation,
          skills: combinedSkills,

          stage: "Applied",
          tags: [],
          category: "",
          rating: 0,
          notes: "",
          history: [],
        };
      })
      .addCase(parseResume.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) || "Resume parsing failed";
      });
  },
});

export const { resetImport, updateParsedData } = candidateImportSlice.actions;
export default candidateImportSlice.reducer;
