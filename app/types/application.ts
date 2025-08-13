// app/types/application.ts
export interface Application {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  resumeText?: string;
  linkedIn?: string;
  location?: string;
  languages?: string[];
  jobTitle?: string;
  originalFilename?: string;
  fileType?: string;
  fileSize?: number;
  resumeFileURL?: string | null;
  resumeScore?: number;
  resumeScoringDetails?: any;
  scoredAgainstJobId?: string | null;
  scoredAgainstJobTitle?: string | null;
  source: "manual_upload" | "email_import" | "api_import";
  status:
    | "pending"
    | "pending_rev"
    | "pending_review"
    | "approved"
    | "rejected"
    | "converted";
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  candidateId?: string; // Set when converted to candidate
  extractedData?: any; // Extracted data from resume parsing
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationFilters {
  status?: Application["status"];
  source?: Application["source"];
  dateRange?: {
    start: string;
    end: string;
  };
  search?: string;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  converted: number;
}
