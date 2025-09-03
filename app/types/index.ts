// app/types/index.ts
// Re-export all types from centralized location
export * from "./application";
export * from "./candidate";
export * from "./client";
export * from "./communication";
export * from "./email";
export * from "./interview";
export * from "./job";
export * from "./stage";

// Common utility types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  total?: number;
}

export interface FilterOptions {
  search?: string;
  stage?: string;
  tags?: string[];
  category?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface SortOptions {
  field: string;
  direction: "asc" | "desc";
}
