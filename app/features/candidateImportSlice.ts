// app/features/candidateImportSlice.ts

import {
  createAsyncThunk,
  createSlice,
  type PayloadAction,
} from "@reduxjs/toolkit";
import axios from "axios";

type CandidateData = {
  name: string;
  email: string;
  phone: string;
  experience: string;
  education: string;
  skills: string[];
  resumeText: string;

  // Additional fields from Affinda
  linkedIn?: string;
  location?: string;
  languages?: string[];
  jobTitle?: string;

  // File metadata
  originalFilename?: string;
  fileType?: string;
  fileSize?: number;

  // Default Firestore fields
  stage?: string;
  stageId?: string;
  tags?: string[];
  category?: string;
  rating?: number;
  notes?: string;
  history?: { date: string; note: string }[];

  // Raw Affinda data for reference
  affindaData?: any;

  resumeScore?: number | null; // Added for scoring
  resumeScoringDetails?: any; // Added for scoring details
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

// Helper functions for formatting Affinda data
const extractExperienceYears = (workExperience: any[]): string => {
  if (!workExperience || workExperience.length === 0) return "";

  // Calculate total years of experience from work history
  let totalMonths = 0;

  workExperience.forEach((job) => {
    if (job.startDate && (job.endDate || job.isCurrent)) {
      const startDate = new Date(job.startDate);
      const endDate = job.isCurrent ? new Date() : new Date(job.endDate);

      // Calculate months between dates
      const months =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());

      if (months > 0) {
        totalMonths += months;
      }
    }
  });

  // Convert months to years (rounded to 1 decimal place)
  const years = (totalMonths / 12).toFixed(1);
  return `${years} years`;
};

const formatEducation = (education: any[]): string => {
  if (!education || education.length === 0) return "";

  return education
    .map((edu) => {
      const degree =
        edu.accreditation?.inputStr ||
        edu.degree ||
        edu.accreditation?.education ||
        "";
      const institution = edu.organization || "";
      const year = edu.dates?.endDate
        ? new Date(edu.dates.endDate).getFullYear()
        : "";
      const date = edu.dates?.rawText || "";

      if (degree && institution) {
        if (year) {
          return `${degree} at ${institution} (${year})`;
        } else if (date) {
          return `${degree} at ${institution} (${date})`;
        } else {
          return `${degree} at ${institution}`;
        }
      } else {
        const parts = [degree, institution, date || year].filter(Boolean);
        return parts.join(", ");
      }
    })
    .join("; ");
};

const formatLocation = (location: any): string => {
  if (!location) return "";

  const parts = [location.city, location.state, location.country].filter(
    Boolean
  );

  return parts.join(", ");
};

export const parseResume = createAsyncThunk(
  "candidateImport/parseResume",
  async (file: File, { rejectWithValue }) => {
    try {
      const AFFINDA_API_KEY = import.meta.env.VITE_AFFINDA_API_KEY;

      if (!AFFINDA_API_KEY) {
        return rejectWithValue(
          "Affinda API key not found. Please check your environment variables."
        );
      }

      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("wait", "true"); // Wait for processing to complete
      formData.append("identifier", file.name); // Use filename as identifier

      // Specify resume as the document type
      formData.append("collection", "resumes");

      const response = await axios.post(
        "https://api.affinda.com/v3/documents",
        formData,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${AFFINDA_API_KEY}`,
            // Don't set Content-Type here as FormData will set it with the boundary
          },
        }
      );

      return {
        data: response.data,
        fileMetadata: {
          name: file.name,
          type: file.type,
          size: file.size,
        },
      };
    } catch (error: any) {
      let message = error.message || "Unknown error";
      if (error.response?.data && typeof error.response.data === "object") {
        message = JSON.stringify(error.response.data);
      } else if (error.response?.data) {
        message = error.response.data;
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

        const affindaData = action.payload?.data?.data || {};
        const fileMetadata = action.payload?.fileMetadata || {};

        // Extract skills and certifications
        const skillObjs = Array.isArray(affindaData.skills)
          ? affindaData.skills.map((sk: any) => sk.name || "").filter(Boolean)
          : [];

        const certifications = Array.isArray(affindaData.certifications)
          ? affindaData.certifications
              .map((cert: any) => cert.name || cert)
              .filter(Boolean)
          : [];

        const languages = Array.isArray(affindaData.languages)
          ? affindaData.languages
              .map((lang: any) => lang.name || lang)
              .filter(Boolean)
          : [];

        // Extract email and phone
        const email =
          Array.isArray(affindaData.emails) && affindaData.emails.length > 0
            ? affindaData.emails[0]
            : "";

        const phone =
          Array.isArray(affindaData.phoneNumbers) &&
          affindaData.phoneNumbers.length > 0
            ? affindaData.phoneNumbers[0]
            : "";

        // Extract name
        let name = "";
        if (typeof affindaData.name === "object") {
          name = affindaData.name?.raw || "";
        } else if (typeof affindaData.name === "string") {
          name = affindaData.name;
        }

        // Try to find LinkedIn URL
        const linkedIn =
          affindaData.linkedin ||
          (Array.isArray(affindaData.websites)
            ? affindaData.websites.find((site: string) =>
                site.includes("linkedin.com")
              )
            : "");

        // Create parsed data object
        state.parsedData = {
          // Basic information
          name,
          email,
          phone,
          resumeText: affindaData.rawText || "",

          // Experience and education
          experience: affindaData.totalYearsExperience
            ? `${affindaData.totalYearsExperience} years`
            : extractExperienceYears(affindaData.workExperience || []),
          education: formatEducation(affindaData.education || []),

          // Skills and languages
          skills: [...skillObjs, ...certifications],
          languages,

          // Additional information
          linkedIn,
          location: formatLocation(affindaData.location),
          jobTitle: affindaData.profession || affindaData.jobTitle || "",

          // File metadata
          originalFilename: fileMetadata.name,
          fileType: fileMetadata.type,
          fileSize: fileMetadata.size,

          // Store raw Affinda data for reference
          affindaData,

          // Default fields for storage
          stageId: "",
          tags: skillObjs.slice(0, 3), // Use top 3 skills as initial tags
          category: "",
          rating: 0,
          notes: "",
          history: [
            {
              date: new Date().toISOString(),
              note: "Candidate imported from resume",
            },
          ],
        };

        // If there's no email or phone, try to extract from raw text
        if (!email && affindaData.rawText) {
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
          const matches = affindaData.rawText.match(emailRegex);

          if (matches && matches.length > 0) {
            state.parsedData.email = matches[0];
          }
        }

        if (!phone && affindaData.rawText) {
          const phoneRegex =
            /(\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/g;
          const matches = affindaData.rawText.match(phoneRegex);

          if (matches && matches.length > 0) {
            state.parsedData.phone = matches[0];
          }
        }
      })
      .addCase(parseResume.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) || "Resume parsing failed";
      });
  },
});

export const { resetImport, updateParsedData } = candidateImportSlice.actions;
export default candidateImportSlice.reducer;
