// app/types/stage.ts
export interface Stage {
  id: string;
  title: string;
  color: string; // Can be hex color (#3b82f6) OR CSS classes (bg-yellow-50 border-yellow-200 text-yellow-700)
  description?: string;
  order: number; // Stage order for workflow positioning - now required for consistency
  isDefault?: boolean;
  isActive?: boolean;
  jobId?: string; // Optional: if stage is specific to a job, null for global stages
  createdAt?: string;
  updatedAt?: string;
  // Dynamic styling properties (for backward compatibility)
  className?: string; // CSS classes for dynamic styling
  textColor?: string; // Text color override
  bgColor?: string; // Background color override
  borderColor?: string; // Border color override
}
