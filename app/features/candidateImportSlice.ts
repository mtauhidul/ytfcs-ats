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

// Affinda Resume Parsing
export const parseResume = createAsyncThunk(
  "candidateImport/parseResume",
  async (file: File, { rejectWithValue }) => {
    try {
      const AFFINDA_API_KEY = import.meta.env.VITE_AFFINDA_API_KEY;
      const formData = new FormData();
      formData.append("file", file);

      // v2 endpoint with trailing slash
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

        // 1. Convert name object => string
        let candidateName = "";
        if (typeof affindaData.name === "object") {
          // If affindaData.name = { raw: "John Doe", first: "John", last: "Doe", ... }
          candidateName = affindaData.name.raw || "No Name";
        } else if (typeof affindaData.name === "string") {
          candidateName = affindaData.name;
        }

        // 2. Convert numeric experience to string
        const yrs = affindaData.totalYearsExperience;
        const candidateExperience =
          typeof yrs === "number" ? `${yrs} years` : "";

        // 3. Flatten education array of objects
        //    Example: "Bachelor of Science at University of Anytown (2009 – 2013)"
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

        // 4. Combine "certifications" + "skills" => one final array
        //    If you'd rather keep them separate, skip this step.
        //    (Your screenshot shows "certifications": ["Programming JavaScript Python Java SQL"]
        //     and "skills" is an array of objects with .name)
        const certifications = Array.isArray(affindaData.certifications)
          ? affindaData.certifications
          : [];
        const skillObjs = Array.isArray(affindaData.skills)
          ? affindaData.skills.map((sk: any) => sk.name || "")
          : [];
        // unify them:
        const combinedSkills = [...certifications, ...skillObjs].filter(
          Boolean
        );

        // Build final parsedData
        state.parsedData = {
          name: candidateName,
          experience: candidateExperience,
          education: candidateEducation,
          skills: combinedSkills,
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
