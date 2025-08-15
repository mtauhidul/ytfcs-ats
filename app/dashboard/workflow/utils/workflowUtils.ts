// app/dashboard/workflow/utils/workflowUtils.ts

import type { Stage } from '~/types';

/**
 * Utility functions for workflow operations
 */

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Convert CSS color classes to hex colors
 */
export const cssClassToHex = (cssClass: string): string => {
  const colorMap: Record<string, string> = {
    'bg-blue-50 border-blue-200 text-blue-700': '#3b82f6',
    'bg-purple-50 border-purple-200 text-purple-700': '#8b5cf6',
    'bg-yellow-50 border-yellow-200 text-yellow-700': '#f59e0b',
    'bg-red-50 border-red-200 text-red-700': '#ef4444',
    'bg-cyan-50 border-cyan-200 text-cyan-700': '#06b6d4',
    'bg-green-50 border-green-200 text-green-700': '#10b981',
    'bg-orange-50 border-orange-200 text-orange-700': '#f97316',
    'bg-lime-50 border-lime-200 text-lime-700': '#84cc16',
    'bg-emerald-50 border-emerald-200 text-emerald-700': '#22c55e',
    'bg-gray-50 border-gray-200 text-gray-700': '#6b7280',
  };

  return colorMap[cssClass] || cssClass;
};

/**
 * Convert hex colors to CSS classes (reverse of above)
 */
export const hexToCssClass = (hex: string): string => {
  const colorMap: Record<string, string> = {
    '#3b82f6': 'bg-blue-50 border-blue-200 text-blue-700',
    '#8b5cf6': 'bg-purple-50 border-purple-200 text-purple-700',
    '#f59e0b': 'bg-yellow-50 border-yellow-200 text-yellow-700',
    '#ef4444': 'bg-red-50 border-red-200 text-red-700',
    '#06b6d4': 'bg-cyan-50 border-cyan-200 text-cyan-700',
    '#10b981': 'bg-green-50 border-green-200 text-green-700',
    '#f97316': 'bg-orange-50 border-orange-200 text-orange-700',
    '#84cc16': 'bg-lime-50 border-lime-200 text-lime-700',
    '#22c55e': 'bg-emerald-50 border-emerald-200 text-emerald-700',
    '#6b7280': 'bg-gray-50 border-gray-200 text-gray-700',
  };

  return colorMap[hex] || 'bg-gray-50 border-gray-200 text-gray-700';
};

/**
 * Validate workflow stages for consistency and business rules
 */
export const validateWorkflowStages = (stages: Stage[]): WorkflowValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check minimum stages
  if (stages.length === 0) {
    errors.push('Workflow must have at least one stage');
    return { isValid: false, errors, warnings };
  }

  // Check for duplicate titles
  const titles = stages.map(s => s.title.toLowerCase());
  const duplicateTitles = titles.filter((title, index) => titles.indexOf(title) !== index);
  if (duplicateTitles.length > 0) {
    errors.push(`Duplicate stage titles found: ${duplicateTitles.join(', ')}`);
  }

  // Check for missing required fields
  stages.forEach((stage, index) => {
    if (!stage.title?.trim()) {
      errors.push(`Stage ${index + 1} is missing a title`);
    }
    if (!stage.color) {
      errors.push(`Stage "${stage.title}" is missing a color`);
    }
    if (typeof stage.order !== 'number') {
      errors.push(`Stage "${stage.title}" has invalid order`);
    }
  });

  // Check order consistency
  const orders = stages.map(s => s.order).filter(o => typeof o === 'number');
  const sortedOrders = [...orders].sort((a, b) => a - b);
  const hasGaps = sortedOrders.some((order, index) => {
    return index > 0 && order !== sortedOrders[index - 1] + 1;
  });
  
  if (hasGaps) {
    warnings.push('Stage orders have gaps - consider renumbering for consistency');
  }

  // Business rule validations
  const hasStartStage = stages.some(s => 
    s.title.toLowerCase().includes('applied') || 
    s.title.toLowerCase().includes('application')
  );
  if (!hasStartStage) {
    warnings.push('Consider adding an initial application/applied stage');
  }

  const hasEndStage = stages.some(s => 
    s.title.toLowerCase().includes('offer') || 
    s.title.toLowerCase().includes('hired') ||
    s.title.toLowerCase().includes('rejected')
  );
  if (!hasEndStage) {
    warnings.push('Consider adding final stages (offer, hired, rejected)');
  }

  // Check for too many stages (performance consideration)
  if (stages.length > 15) {
    warnings.push('Workflow has many stages - consider consolidating for better UX');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Normalize stage orders to be sequential starting from 1
 */
export const normalizeStageOrders = (stages: Stage[]): Stage[] => {
  return stages
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((stage, index) => ({
      ...stage,
      order: index + 1
    }));
};

/**
 * Find gaps in stage order sequence
 */
export const findOrderGaps = (stages: Stage[]): number[] => {
  const orders = stages.map(s => s.order).filter(o => typeof o === 'number').sort((a, b) => a - b);
  const gaps: number[] = [];
  
  for (let i = 1; i < orders.length; i++) {
    const current = orders[i];
    const previous = orders[i - 1];
    
    for (let gap = previous + 1; gap < current; gap++) {
      gaps.push(gap);
    }
  }
  
  return gaps;
};

/**
 * Get suggested stage order for a new stage
 */
export const getSuggestedOrder = (existingStages: Stage[], insertAfterStageId?: string): number => {
  if (existingStages.length === 0) {
    return 1;
  }

  if (insertAfterStageId) {
    const insertAfterStage = existingStages.find(s => s.id === insertAfterStageId);
    if (insertAfterStage && insertAfterStage.order) {
      return insertAfterStage.order + 1;
    }
  }

  // Find the highest order and add 1
  const maxOrder = Math.max(...existingStages.map(s => s.order || 0));
  return maxOrder + 1;
};

/**
 * Check if a stage can be safely deleted
 */
export const canDeleteStage = (stage: Stage, workflow: Stage[]): { canDelete: boolean; reason?: string } => {
  // Always allow deletion if more than one stage
  if (workflow.length > 1) {
    return { canDelete: true };
  }

  return { 
    canDelete: false, 
    reason: 'Cannot delete the last remaining stage in the workflow' 
  };
};

/**
 * Generate a unique stage title
 */
export const generateUniqueStageTitle = (baseTitle: string, existingStages: Stage[]): string => {
  const existingTitles = existingStages.map(s => s.title.toLowerCase());
  let title = baseTitle;
  let counter = 1;

  while (existingTitles.includes(title.toLowerCase())) {
    title = `${baseTitle} ${counter}`;
    counter++;
  }

  return title;
};

/**
 * Calculate workflow completion statistics
 */
export const calculateWorkflowStats = (stages: Stage[], candidates: any[] = []) => {
  const totalCandidates = candidates.length;
  const stageStats = stages.map(stage => {
    const candidatesInStage = candidates.filter(c => c.stageId === stage.id);
    return {
      stageId: stage.id,
      title: stage.title,
      count: candidatesInStage.length,
      percentage: totalCandidates > 0 ? (candidatesInStage.length / totalCandidates) * 100 : 0
    };
  });

  return {
    totalCandidates,
    stageStats,
    averageStageUtilization: stageStats.reduce((sum, stat) => sum + stat.percentage, 0) / stages.length
  };
};

/**
 * Validate stage transition rules (future enhancement)
 */
export const validateStageTransition = (
  fromStageId: string, 
  toStageId: string, 
  workflow: Stage[]
): { isValid: boolean; reason?: string } => {
  const fromStage = workflow.find(s => s.id === fromStageId);
  const toStage = workflow.find(s => s.id === toStageId);

  if (!fromStage || !toStage) {
    return { isValid: false, reason: 'Invalid stage IDs' };
  }

  // For now, allow all transitions
  // Future: implement business rules like "can't move back to earlier stages"
  return { isValid: true };
};

/**
 * Sort stages by order with fallback handling
 */
export const sortStagesByOrder = (stages: Stage[]): Stage[] => {
  return [...stages].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Fallback to title if orders are equal
    return a.title.localeCompare(b.title);
  });
};
