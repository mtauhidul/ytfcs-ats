// app/types/interview.ts
export interface Interview {
  id: string;
  candidateId: string;
  candidateName: string;
  interviewerId: string;
  interviewerName: string;
  interviewerEmail?: string;
  scheduledDate: string;
  scheduledTime: string;
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  outcome?: "pending" | "passed" | "rejected" | "on-hold";
  notes?: string;
  feedbackId?: string;
  location?: string;
  duration?: number; // minutes
  createdAt: string;
  updatedAt?: string;
  scheduledBy?: string;
}

export interface InterviewFeedback {
  id: string;
  interviewId: string;
  candidateId: string;
  candidateName: string;
  interviewerId: string;
  interviewerName: string;

  // Rating fields
  technicalSkills: number; // 1-5
  communication: number; // 1-5
  culturalFit: number; // 1-5
  experience: number; // 1-5
  overallRating: number; // 1-5

  // Detailed feedback
  strengths: string;
  weaknesses: string;
  improvementAreas: string;

  // Decision
  recommendation:
    | "strong-hire"
    | "hire"
    | "consider"
    | "no-hire"
    | "strong-no-hire";
  reasoning: string;

  // Additional notes
  notes?: string;
  nextSteps?: string;

  createdAt: string;
  updatedAt?: string;
}

export interface InterviewSummary {
  candidateId: string;
  candidateName: string;
  totalInterviews: number;
  completedInterviews: number;
  pendingInterviews: number;
  averageRating?: number;
  lastInterviewDate?: string;
  lastInterviewOutcome?: string;
}

// For displaying in tables/lists
export interface InterviewListItem {
  id: string;
  candidateName: string;
  interviewerName: string;
  scheduledDate: string;
  status: Interview["status"];
  outcome?: Interview["outcome"];
  overallRating?: number;
}
