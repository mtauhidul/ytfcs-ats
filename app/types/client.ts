// app/types/client.ts
export interface Client {
  id: string;
  name: string;
  companyName: string;
  contactEmail: string;
  contactPhone?: string;
  
  // Address & Location
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  
  // Company Details
  industry?: string;
  companySize?: string;
  website?: string;
  description?: string;
  
  // Hiring Preferences & Criteria
  hiringPreferences?: {
    preferredExperienceLevel?: string[];
    requiredSkills?: string[];
    culturalFit?: string;
    salaryBudgetRange?: {
      min: number;
      max: number;
      currency: string;
    };
    interviewProcess?: string;
    timeToHire?: string; // Expected hiring timeline
    workArrangement?: string[]; // remote, hybrid, onsite
  };
  
  // Communication & Feedback History
  feedbackHistory?: ClientFeedback[];
  communicationLog?: ClientCommunicationEntry[];
  
  // Business Relationship
  relationshipManager?: string; // Internal team member managing this client
  priority?: "low" | "medium" | "high";
  status: "active" | "inactive" | "prospect" | "archived";
  
  // Contract & Business Info
  contractType?: string;
  feeStructure?: string;
  notes?: string;
  
  // Metadata
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  lastModifiedBy?: string;
  
  // Activity Stats (calculated fields)
  activeJobs?: number;
  totalCandidatesSubmitted?: number;
  totalHires?: number;
  averageTimeToHire?: number;
}

export interface ClientFeedback {
  id: string;
  candidateId?: string;
  candidateName?: string;
  jobId?: string;
  jobTitle?: string;
  feedbackType: "interview" | "general" | "rejection" | "offer" | "preference";
  rating?: number; // 1-5 scale
  feedback: string;
  strengths?: string[];
  concerns?: string[];
  recommendation?: "hire" | "consider" | "reject" | "on-hold";
  feedbackDate: string;
  receivedVia: "email" | "phone" | "meeting" | "form" | "other";
  receivedBy: string; // Internal team member who received feedback
  followUpRequired?: boolean;
  followUpNotes?: string;
  createdAt: string;
}

export interface ClientCommunicationEntry {
  id: string;
  type: "email" | "phone" | "meeting" | "note";
  subject?: string;
  summary: string;
  details?: string;
  date: string;
  initiatedBy: "client" | "internal";
  teamMember: string; // Who handled the communication
  followUpRequired?: boolean;
  followUpDate?: string;
  attachments?: string[];
  createdAt: string;
}

// For display in lists and dropdowns
export interface ClientBasic {
  id: string;
  name: string;
  companyName: string;
  contactEmail: string;
  status: string;
}

// For analytics and reporting
export interface ClientStats {
  totalClients: number;
  activeClients: number;
  totalJobsAssigned: number;
  averageCandidatesPerJob: number;
  successRate: number; // percentage of hires vs submissions
  clientSatisfactionScore?: number;
}

// For client selection in forms
export interface ClientOption {
  value: string;
  label: string;
  companyName: string;
  status: string;
}
