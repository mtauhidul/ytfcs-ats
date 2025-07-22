// app/types/job.ts
export interface Job {
  id: string;
  jobId?: string; // Custom job ID
  title: string;
  description?: string;
  requirements?: string[];
  location?: string;
  salaryRange?: string;
  salary?: string; // Legacy field
  department?: string;
  employmentType?: string;
  tags: string[];
  category: string;
  statusId: string;
  statusColor?: string;
  status: string; // Legacy field
  priority?: "low" | "medium" | "high";
  remote?: boolean;
  experienceLevel?: string;
  experience?: string; // Legacy field
  education?: string;
  skills?: string[];
  requiredSkills?: string[];
  preferredSkills?: string[];
  benefits?: string[];
  certifications?: string[];
  applicationDeadline?: string;
  hiringManagerId?: string;
  teamId?: string;
  budgetRange?: {
    min: number;
    max: number;
    currency: string;
  };
  history?: {
    date: string;
    note: string;
    userId?: string;
    action?: string;
  }[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  lastModifiedBy?: string;
  // Function props
  onEdit?: (job: Job) => void;
  onView?: (job: Job) => void;
  onDelete?: (job: Job) => void;
}

export interface JobBasic {
  id: string;
  title: string;
  status: string;
  location: string;
  department: string;
  salary: string;
}
