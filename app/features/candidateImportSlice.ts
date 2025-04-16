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
  file: File | null;
  parsedData: Partial<CandidateData> | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: CandidateImportState = {
  file: null,
  parsedData: null,
  status: "idle",
  error: null,
};

// Thunk to parse resume using Affinda
export const parseResume = createAsyncThunk(
  "candidateImport/parseResume",
  async (file: File, { rejectWithValue }) => {
    try {
      const AFFINDA_API_KEY = import.meta.env.VITE_AFFINDA_API_KEY;
      const formData = new FormData();
      formData.append("file", file);

      // See Affinda docs for correct endpoint & structure
      const response = await axios.post(
        "https://api.affinda.com/v3/resumes",
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
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const candidateImportSlice = createSlice({
  name: "candidateImport",
  initialState,
  reducers: {
    setFile: (state, action: PayloadAction<File | null>) => {
      state.file = action.payload;
    },
    updateParsedData: (
      state,
      action: PayloadAction<Partial<CandidateData>>
    ) => {
      state.parsedData = { ...state.parsedData, ...action.payload };
    },
    resetImport: (state) => {
      state.file = null;
      state.parsedData = null;
      state.status = "idle";
      state.error = null;
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
        // Example: adapt to your actual Affinda response
        const affindaData = action.payload?.data;
        state.parsedData = {
          name: affindaData?.name?.raw || "",
          experience: affindaData?.totalYearsExperience
            ? `${affindaData.totalYearsExperience} years`
            : "",
          education: affindaData?.education
            ?.map((edu: any) => edu.raw)
            .join(", "),
          skills: affindaData?.skills?.map((skill: any) => skill.name) || [],
        };
      })
      .addCase(parseResume.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) || "Resume parsing failed";
      });
  },
});

export const { setFile, updateParsedData, resetImport } =
  candidateImportSlice.actions;

export default candidateImportSlice.reducer;
