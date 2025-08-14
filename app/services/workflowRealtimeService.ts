import { collection, doc, onSnapshot, query, where, orderBy, type Unsubscribe } from 'firebase/firestore';
import { db } from '~/lib/firebase';
import { store } from '~/store';
import { 
  setJobWorkflow,
  clearError,
  setInitialized,
  fetchWorkflowTemplates
} from '~/features/workflowSlice';
import type { Stage } from '~/types';

class WorkflowRealtimeService {
  private unsubscribers: Map<string, Unsubscribe> = new Map();
  private isInitialized = false;

  /**
   * Initialize real-time listeners for workflow-related collections
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('WorkflowRealtimeService is already initialized');
      return;
    }

    try {
      // Fetch workflow templates initially
      store.dispatch(fetchWorkflowTemplates());
      
      this.isInitialized = true;
      console.log('✅ WorkflowRealtimeService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize WorkflowRealtimeService:', error);
      throw error;
    }
  }

  /**
   * Setup real-time listener for a specific job's workflow
   */
  setupJobWorkflowListener(jobId: string): Unsubscribe {
    const stagesRef = collection(db, 'stages');
    const jobQuery = query(
      stagesRef, 
      where('jobId', '==', jobId),
      orderBy('order', 'asc')
    );

    const unsubscribe = onSnapshot(
      jobQuery,
      (snapshot) => {
        const stages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Stage[];

        // Update job workflow in store
        store.dispatch(setJobWorkflow({ jobId, stages }));
        console.log(`🎯 Synced ${stages.length} stages for job ${jobId}`);
      },
      (error) => {
        console.error(`❌ Job ${jobId} workflow listener error:`, error);
      }
    );

    // Store the unsubscriber
    this.unsubscribers.set(`job-${jobId}`, unsubscribe);
    return unsubscribe;
  }

  /**
   * Stop listening to a specific job's workflow
   */
  stopJobWorkflowListener(jobId: string): void {
    const key = `job-${jobId}`;
    const unsubscribe = this.unsubscribers.get(key);
    
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribers.delete(key);
      console.log(`� Stopped listening to job ${jobId} workflow`);
    }
  }

  /**
   * Setup listener for all workflow templates
   */
  setupTemplatesListener(): Unsubscribe {
    const templatesRef = collection(db, 'workflowTemplates');
    const templatesQuery = query(templatesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      templatesQuery,
      (snapshot) => {
        // Trigger template refetch when changes occur
        store.dispatch(fetchWorkflowTemplates());
        console.log(`� Template changes detected, refreshing...`);
      },
      (error) => {
        console.error('❌ Workflow templates listener error:', error);
      }
    );

    this.unsubscribers.set('templates', unsubscribe);
    return unsubscribe;
  }

  /**
   * Clean up all listeners
   */
  cleanup(): void {
    console.log('🧹 Cleaning up WorkflowRealtimeService listeners...');
    
    this.unsubscribers.forEach((unsubscribe, key) => {
      try {
        unsubscribe();
        console.log(`✅ Cleaned up ${key} listener`);
      } catch (error) {
        console.error(`❌ Error cleaning up ${key} listener:`, error);
      }
    });

    this.unsubscribers.clear();
    this.isInitialized = false;
    
    console.log('✅ WorkflowRealtimeService cleanup completed');
  }

  /**
   * Check if service is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get active listeners count
   */
  get activeListeners(): number {
    return this.unsubscribers.size;
  }

  /**
   * Force refresh templates
   */
  async refreshTemplates(): Promise<void> {
    console.log('🔄 Refreshing workflow templates...');
    store.dispatch(fetchWorkflowTemplates());
  }

  /**
   * Setup connection state monitoring
   */
  setupConnectionMonitoring(): void {
    // Only setup monitoring in browser environment
    if (typeof window !== 'undefined') {
      // Monitor online/offline status
      window.addEventListener('online', () => {
        console.log('🌐 Connection restored, refreshing workflow data...');
        this.refreshTemplates();
      });

      window.addEventListener('offline', () => {
        console.log('📵 Connection lost, workflow sync paused');
      });
    }
  }
}

// Create singleton instance
export const workflowRealtimeService = new WorkflowRealtimeService();

// Auto-cleanup on page unload (only in browser)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    workflowRealtimeService.cleanup();
  });
}

export default workflowRealtimeService;
