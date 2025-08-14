/**
 * Utility functions for enhanced workflow functionality
 */

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Debounce function to limit frequent calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Format candidate name for display with proper casing
 */
export function formatCandidateName(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Calculate time since last update
 */
export function getTimeSince(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
}

/**
 * Generate analytics data for workflow performance
 */
export interface WorkflowAnalytics {
  totalCandidates: number;
  stageDistribution: Record<string, number>;
  averageRating: number;
  recentActivity: number;
}

export function generateWorkflowAnalytics(
  candidates: any[],
  stages: any[]
): WorkflowAnalytics {
  const stageDistribution = stages.reduce((acc, stage) => {
    acc[stage.title] = candidates.filter(c => c.stageId === stage.id).length;
    return acc;
  }, {} as Record<string, number>);

  const ratingsSum = candidates.reduce((sum, candidate) => {
    return sum + (candidate.rating || 0);
  }, 0);

  const averageRating = candidates.length > 0 ? ratingsSum / candidates.length : 0;

  // Count candidates updated in last 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const recentActivity = candidates.filter(candidate => {
    if (!candidate.updatedAt) return false;
    return new Date(candidate.updatedAt) > yesterday;
  }).length;

  return {
    totalCandidates: candidates.length,
    stageDistribution,
    averageRating: Math.round(averageRating * 10) / 10,
    recentActivity,
  };
}
