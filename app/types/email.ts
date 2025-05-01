// types/email.ts

/**
 * Email provider types
 */
export type EmailProvider = "gmail" | "outlook" | "other";

/**
 * Email message interface
 */
export interface EmailMessage {
  id: string;
  from: {
    name: string;
    email: string;
  };
  subject: string;
  receivedAt: string;
  hasAttachments: boolean;
  attachments?: EmailAttachment[];
  isSelected?: boolean;
  isProcessed?: boolean;
  isImported?: boolean;
}

/**
 * Email attachment interface
 */
export interface EmailAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isResume: boolean;
}

/**
 * Email provider configuration
 */
export interface EmailConfig {
  provider: EmailProvider;
  server?: string;
  port?: string;
  username: string;
  password: string;
}

/**
 * Email filter options
 */
export interface EmailFilter {
  dateFilter?: "all" | "today" | "week" | "month";
  withAttachments?: boolean;
  jobRelated?: boolean;
  searchTerm?: string;
}

/**
 * Email connection response
 */
export interface EmailConnectionResponse {
  success: boolean;
  message: string;
}

/**
 * Email list response
 */
export interface EmailListResponse {
  success: boolean;
  emails: EmailMessage[];
}

/**
 * Email process response
 */
export interface EmailProcessResponse {
  success: boolean;
  processed: number;
  candidates: Array<{
    id: string;
    name: string;
    email: string;
    [key: string]: any;
  }>;
}

/**
 * Imported candidate data
 */
export interface ImportedCandidate {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  source: string;
  stageId: string;
  createdAt: string;
  updatedAt: string;
  history: Array<{
    date: string;
    note: string;
  }>;
  tags: string[];
  hasResume?: boolean;
  resumeFileName?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  notes?: string;
}
