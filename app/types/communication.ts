// app/types/communication.ts
export interface EmailData {
  to: string;
  subject: string;
  message: string;
  from?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    content: string;
    type: string;
  }>;
}

export interface AssignmentNotificationData {
  assigneeEmail: string;
  assigneeName: string;
  candidateName: string;
  candidateId: string;
  assignedBy: string;
  message?: string;
}

export interface TeamMemberNotificationData {
  memberEmail: string;
  memberName: string;
  subject: string;
  message: string;
  notificationType?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageRecord {
  id: string;
  candidateId: string;
  candidateName: string;
  subject: string;
  body: string;
  status: "sending" | "sent" | "failed" | "read";
  type: "email" | "sms";
  sentAt: string;
  readAt?: string;
  error?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

export interface FeedbackEntry {
  id: string;
  candidateId: string;
  candidateName: string;
  teamMemberId: string;
  teamMemberName: string;
  rating: number;
  strengths: string;
  weaknesses: string;
  recommendation: "hire" | "consider" | "reject";
  createdAt: string;
  updatedAt?: string;
}
