// app/lib/workflow-error-handler.ts

import { toast } from "sonner";

export interface WorkflowError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
}

export class WorkflowErrorHandler {
  private static retryAttempts = new Map<string, number>();
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000; // Base delay in ms

  /**
   * Handle workflow-related errors with appropriate user feedback and retry logic
   */
  static handleError(error: any, operation: string, context?: any): WorkflowError {
    const workflowError = this.classifyError(error, operation);
    
    // Log error for debugging
    console.error(`Workflow Error [${operation}]:`, {
      error: workflowError,
      context,
      timestamp: new Date().toISOString()
    });

    // Show user-friendly error message
    this.showErrorToUser(workflowError, operation);

    return workflowError;
  }

  /**
   * Classify Firebase/network errors into workflow-specific error types
   */
  private static classifyError(error: any, operation: string): WorkflowError {
    // Firebase errors
    if (error.code) {
      switch (error.code) {
        case 'permission-denied':
          return {
            code: 'PERMISSION_DENIED',
            message: 'You do not have permission to perform this action',
            details: error,
            retryable: false
          };
        
        case 'not-found':
          return {
            code: 'RESOURCE_NOT_FOUND',
            message: 'The requested workflow resource was not found',
            details: error,
            retryable: false
          };
        
        case 'unavailable':
        case 'deadline-exceeded':
          return {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Service temporarily unavailable. Please try again.',
            details: error,
            retryable: true
          };
        
        case 'quota-exceeded':
          return {
            code: 'QUOTA_EXCEEDED',
            message: 'Service quota exceeded. Please try again later.',
            details: error,
            retryable: true
          };
        
        default:
          return {
            code: 'FIREBASE_ERROR',
            message: `Firebase error: ${error.message}`,
            details: error,
            retryable: true
          };
      }
    }

    // Network errors
    if (error.name === 'NetworkError' || !navigator.onLine) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connection error. Please check your internet connection.',
        details: error,
        retryable: true
      };
    }

    // Validation errors
    if (operation.includes('validate') || error.message.includes('validation')) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Invalid workflow data provided',
        details: error,
        retryable: false
      };
    }

    // Generic error
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: error,
      retryable: true
    };
  }

  /**
   * Show user-friendly error messages with appropriate actions
   */
  private static showErrorToUser(error: WorkflowError, operation: string) {
    const operationName = this.getOperationDisplayName(operation);
    
    switch (error.code) {
      case 'PERMISSION_DENIED':
        toast.error(`Permission Denied`, {
          description: `You don't have permission to ${operationName}. Please contact your administrator.`,
        });
        break;
        
      case 'NETWORK_ERROR':
        toast.error(`Network Error`, {
          description: 'Please check your internet connection and try again.',
          action: {
            label: 'Retry',
            onClick: () => this.scheduleRetry(operation)
          }
        });
        break;
        
      case 'SERVICE_UNAVAILABLE':
        toast.error(`Service Unavailable`, {
          description: 'The service is temporarily unavailable. Retrying automatically...',
        });
        break;
        
      case 'VALIDATION_ERROR':
        toast.error(`Invalid Data`, {
          description: 'Please check your input and try again.',
        });
        break;
        
      default:
        toast.error(`Error ${operationName}`, {
          description: error.retryable 
            ? 'Something went wrong. Retrying automatically...'
            : 'Something went wrong. Please refresh the page and try again.',
          action: error.retryable ? {
            label: 'Retry Now',
            onClick: () => this.scheduleRetry(operation)
          } : undefined
        });
    }
  }

  /**
   * Convert operation codes to user-friendly display names
   */
  private static getOperationDisplayName(operation: string): string {
    const operationMap: Record<string, string> = {
      'fetchWorkflow': 'loading workflow',
      'createWorkflow': 'creating workflow',
      'updateWorkflow': 'updating workflow',
      'deleteWorkflow': 'deleting workflow',
      'addStage': 'adding stage',
      'removeStage': 'removing stage',
      'reorderStages': 'reordering stages',
      'fetchTemplates': 'loading templates',
      'createTemplate': 'creating template',
      'deleteTemplate': 'deleting template',
      'moveCandidates': 'moving candidates',
    };
    
    return operationMap[operation] || operation;
  }

  /**
   * Implement exponential backoff retry logic
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    const retryKey = operationName;
    let currentAttempt = this.retryAttempts.get(retryKey) || 0;

    try {
      const result = await operation();
      // Reset retry counter on success
      this.retryAttempts.delete(retryKey);
      return result;
    } catch (error) {
      currentAttempt++;
      this.retryAttempts.set(retryKey, currentAttempt);

      if (currentAttempt >= maxRetries) {
        // Max retries reached, handle the error
        this.retryAttempts.delete(retryKey);
        throw this.handleError(error, operationName);
      }

      // Calculate delay with exponential backoff
      const delay = this.RETRY_DELAY * Math.pow(2, currentAttempt - 1);
      
      console.log(`Retrying ${operationName} (attempt ${currentAttempt}/${maxRetries}) after ${delay}ms`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Recursive retry
      return this.retryOperation(operation, operationName, maxRetries);
    }
  }

  /**
   * Schedule a retry for failed operations
   */
  private static scheduleRetry(operation: string) {
    // This would need to be connected to the actual operation
    console.log(`Scheduling retry for: ${operation}`);
    // Implementation would depend on how operations are structured
  }

  /**
   * Validate workflow data before operations
   */
  static validateWorkflowData(data: any, type: 'workflow' | 'stage' | 'template'): void {
    switch (type) {
      case 'workflow':
        this.validateWorkflow(data);
        break;
      case 'stage':
        this.validateStage(data);
        break;
      case 'template':
        this.validateTemplate(data);
        break;
    }
  }

  private static validateWorkflow(workflow: any): void {
    if (!workflow.jobId) {
      throw new Error('Workflow must have a jobId');
    }
    if (!workflow.stageIds || !Array.isArray(workflow.stageIds)) {
      throw new Error('Workflow must have stageIds array');
    }
    if (workflow.stageIds.length === 0) {
      throw new Error('Workflow must have at least one stage');
    }
  }

  private static validateStage(stage: any): void {
    if (!stage.title || typeof stage.title !== 'string') {
      throw new Error('Stage must have a valid title');
    }
    if (!stage.color || typeof stage.color !== 'string') {
      throw new Error('Stage must have a valid color');
    }
    if (typeof stage.order !== 'number') {
      throw new Error('Stage must have a valid order number');
    }
  }

  private static validateTemplate(template: any): void {
    if (!template.name || typeof template.name !== 'string') {
      throw new Error('Template must have a valid name');
    }
    if (!template.stageIds || !Array.isArray(template.stageIds)) {
      throw new Error('Template must have stageIds array');
    }
    if (template.stageIds.length === 0) {
      throw new Error('Template must have at least one stage');
    }
  }
}

/**
 * Wrapper for Firebase operations with built-in error handling and retry logic
 */
export const withWorkflowErrorHandling = <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  return WorkflowErrorHandler.retryOperation(operation, operationName);
};

/**
 * Utility to handle workflow validation
 */
export const validateWorkflow = (data: any, type: 'workflow' | 'stage' | 'template') => {
  try {
    WorkflowErrorHandler.validateWorkflowData(data, type);
    return { isValid: true, error: null };
  } catch (error) {
    return { 
      isValid: false, 
      error: WorkflowErrorHandler.handleError(error, `validate_${type}`)
    };
  }
};
