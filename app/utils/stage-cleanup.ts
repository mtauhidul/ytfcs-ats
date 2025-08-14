/**
 * Firestore Stages Cleanup Utility
 * 
 * Import and use these functions in your React component or run as standalone script
 */

import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc,
  writeBatch 
} from 'firebase/firestore';
import { db } from '~/lib/firebase'; // Adjust import path as needed
import { toast } from 'sonner';

export interface StageData {
  id: string;
  title?: string;
  description?: string;
  color?: string;
  createdAt?: string;
  updatedAt?: string;
  jobId?: string;
}

/**
 * List all stages in the database
 */
export async function listAllStages(): Promise<StageData[]> {
  try {
    const stagesSnapshot = await getDocs(collection(db, 'stages'));
    const stages: StageData[] = [];
    
    stagesSnapshot.forEach((doc) => {
      const data = doc.data();
      stages.push({
        id: doc.id,
        ...data
      } as StageData);
    });
    
    return stages;
  } catch (error) {
    console.error('Error fetching stages:', error);
    throw error;
  }
}

/**
 * Delete corrupted or unwanted stages
 */
export async function cleanupCorruptedStages(): Promise<number> {
  try {
    const stages = await listAllStages();
    
    if (stages.length === 0) {
      return 0;
    }
    
    // Find corrupted stages
    const stagesToDelete = stages.filter(stage => {
      // Delete stages with CSS classes as titles (corrupted data)
      if (stage.title && (
        stage.title.includes('bg-') || 
        stage.title.includes('border-') || 
        stage.title.includes('text-')
      )) {
        return true;
      }
      
      // Delete stages without proper titles
      if (!stage.title || stage.title.trim() === '') {
        return true;
      }
      
      return false;
    });
    
    if (stagesToDelete.length === 0) {
      return 0;
    }
    
    // Delete in batch
    const batch = writeBatch(db);
    
    stagesToDelete.forEach((stage) => {
      const stageRef = doc(db, 'stages', stage.id);
      batch.delete(stageRef);
    });
    
    await batch.commit();
    return stagesToDelete.length;
  } catch (error) {
    console.error('Error cleaning up stages:', error);
    throw error;
  }
}

/**
 * Remove duplicate stages (keep the first occurrence)
 */
export async function removeDuplicateStages(): Promise<number> {
  try {
    const stages = await listAllStages();
    
    if (stages.length === 0) {
      return 0;
    }
    
    // Group stages by title
    const stageGroups = new Map<string, StageData[]>();
    
    stages.forEach(stage => {
      if (stage.title) {
        const title = stage.title.toLowerCase().trim();
        if (!stageGroups.has(title)) {
          stageGroups.set(title, []);
        }
        stageGroups.get(title)!.push(stage);
      }
    });
    
    // Find duplicates to delete (keep the first one)
    const stagesToDelete: StageData[] = [];
    
    stageGroups.forEach(groupStages => {
      if (groupStages.length > 1) {
        // Keep the first one, delete the rest
        stagesToDelete.push(...groupStages.slice(1));
      }
    });
    
    if (stagesToDelete.length === 0) {
      return 0;
    }
    
    // Delete in batch
    const batch = writeBatch(db);
    
    stagesToDelete.forEach((stage) => {
      const stageRef = doc(db, 'stages', stage.id);
      batch.delete(stageRef);
    });
    
    await batch.commit();
    return stagesToDelete.length;
  } catch (error) {
    console.error('Error removing duplicates:', error);
    throw error;
  }
}

/**
 * Delete specific stages by IDs
 */
export async function deleteStagesByIds(stageIds: string[]): Promise<number> {
  if (!stageIds || stageIds.length === 0) {
    return 0;
  }
  
  try {
    const batch = writeBatch(db);
    
    stageIds.forEach((stageId) => {
      const stageRef = doc(db, 'stages', stageId);
      batch.delete(stageRef);
    });
    
    await batch.commit();
    return stageIds.length;
  } catch (error) {
    console.error('Error deleting specific stages:', error);
    throw error;
  }
}

/**
 * React component hook for cleanup operations
 */
export function useStageCleanup() {
  const handleListStages = async () => {
    try {
      const stages = await listAllStages();
      console.table(stages);
      toast.success(`Found ${stages.length} stages. Check console for details.`);
      return stages;
    } catch (error) {
      toast.error('Failed to list stages');
      throw error;
    }
  };
  
  const handleCleanupCorrupted = async () => {
    try {
      const deletedCount = await cleanupCorruptedStages();
      if (deletedCount > 0) {
        toast.success(`Cleaned up ${deletedCount} corrupted stages`);
      } else {
        toast.success('No corrupted stages found');
      }
      return deletedCount;
    } catch (error) {
      toast.error('Failed to cleanup corrupted stages');
      throw error;
    }
  };
  
  const handleRemoveDuplicates = async () => {
    try {
      const deletedCount = await removeDuplicateStages();
      if (deletedCount > 0) {
        toast.success(`Removed ${deletedCount} duplicate stages`);
      } else {
        toast.success('No duplicate stages found');
      }
      return deletedCount;
    } catch (error) {
      toast.error('Failed to remove duplicate stages');
      throw error;
    }
  };
  
  const handleDeleteSpecific = async (stageIds: string[]) => {
    try {
      const deletedCount = await deleteStagesByIds(stageIds);
      toast.success(`Deleted ${deletedCount} stages`);
      return deletedCount;
    } catch (error) {
      toast.error('Failed to delete stages');
      throw error;
    }
  };
  
  return {
    listStages: handleListStages,
    cleanupCorrupted: handleCleanupCorrupted,
    removeDuplicates: handleRemoveDuplicates,
    deleteSpecific: handleDeleteSpecific
  };
}
