// app/types/candidate.ts
export interface CandidateDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  path?: string;
  url?: string;
}

export interface CommunicationEntry {
  id: string;
  date: string;
  message: string;
  type: "sent" | "received";
  sender: string;
  subject?: string;
  read?: boolean;
}

export interface HistoryEntry {
  date: string;
  note: string;
}

export interface InterviewHistoryEntry {
  id: string;
  interviewerName: string; // Client/Employer name
  interviewerId: string; // Interviewer user ID
  interviewDate: string; // ISO date string
  outcome?: string; // Optional: "pending" | "passed" | "rejected"
  notes?: string; // Optional interview notes
  scheduledBy?: string; // Who scheduled this interview
}

export interface ResumeScoreData {
  finalScore: number;
  componentScores: {
    skillScore: number;
    experienceScore: number;
    educationScore: number;
    jobTitleScore: number;
    certScore: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
  feedback: string;
  metadata: {
    jobId: string;
    jobTitle: string;
    scoredAt: string;
  };
}

// Master Candidate interface - used across the entire application
export interface Candidate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  tags: string[];
  category: string;
  rating: number;
  stageId: string;
  stageColor?: string;
  experience?: string;
  education?: string;
  skills?: string[];
  notes?: string;
  documents: CandidateDocument[];

  // Job relationship
  jobId?: string; // The job this candidate applied for
  
  // Legacy resume fields
  resumeFileURL?: string;
  originalFilename?: string;
  fileType?: string;
  fileSize?: number;

  // Resume score fields
  resumeScore?: number;
  resumeScoringDetails?: ResumeScoreData;
  scoredAgainstJobId?: string;
  scoredAgainstJobTitle?: string;

  // Metadata
  createdAt?: string;
  updatedAt?: string;
  importedAt?: string;
  source?: string;
  status?: string;

  // Activity tracking
  history?: HistoryEntry[];
  communications?: CommunicationEntry[];
  interviewHistory?: InterviewHistoryEntry[];

  // Additional fields for specific contexts
  jobTitle?: string;
  assignedTo?: string | null;
  company?: string;
  position?: string;
  reviewers?: string[];

  // UI-specific fields
  onEdit?: (c: Candidate) => void;
}

// Simplified candidate interface for basic operations
export interface CandidateBasic {
  id: string;
  name: string;
  email?: string;
  stageId?: string;
  tags?: string[];
  rating?: number;
}

// Candidate for import operations
export interface ParsedCandidate {
  name: string;
  email?: string;
  phone?: string;
  experience?: string;
  education?: string;
  skills?: string[];
  resumeText?: string;
  affindaData?: any;
  linkedIn?: string;
  location?: string;
  languages?: string[];
  jobTitle?: string;
  originalFilename?: string;
  fileType?: string;
  fileSize?: number;
  resumeFileURL?: string | null;
  resumeScore?: number;
  resumeScoringDetails?: ResumeScoreData;
}
