/**
 * Firestore Stages Cleanup Script
 * 
 * This script helps clean up unwanted stage data from Firestore.
 * Run this script to remove test data, duplicates, or corrupted stages.
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  deleteDoc, 
  doc,
  writeBatch 
} from 'firebase/firestore';

// Firebase configuration (update with your config)
const firebaseConfig = {
  // Add your Firebase config here
  // You can find this in your Firebase console
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * List all stages in the database
 */
async function listAllStages() {
  console.log('📋 Fetching all stages from Firestore...\n');
  
  try {
    const stagesSnapshot = await getDocs(collection(db, 'stages'));
    const stages = [];
    
    stagesSnapshot.forEach((doc) => {
      const data = doc.data();
      stages.push({
        id: doc.id,
        ...data
      });
    });
    
    console.log(`Found ${stages.length} stages:\n`);
    
    stages.forEach((stage, index) => {
      console.log(`${index + 1}. ID: ${stage.id}`);
      console.log(`   Title: ${stage.title || 'No title'}`);
      console.log(`   Color: ${stage.color || 'No color'}`);
      console.log(`   Description: ${stage.description || 'No description'}`);
      console.log(`   Created: ${stage.createdAt || 'Unknown'}`);
      console.log('   ---');
    });
    
    return stages;
  } catch (error) {
    console.error('❌ Error fetching stages:', error);
    return [];
  }
}

/**
 * Delete all stages (use with caution!)
 */
async function deleteAllStages() {
  console.log('⚠️  WARNING: This will delete ALL stages from Firestore!');
  console.log('⚠️  This action cannot be undone!');
  
  const stages = await listAllStages();
  
  if (stages.length === 0) {
    console.log('✅ No stages to delete.');
    return;
  }
  
  try {
    const batch = writeBatch(db);
    
    stages.forEach((stage) => {
      const stageRef = doc(db, 'stages', stage.id);
      batch.delete(stageRef);
    });
    
    await batch.commit();
    console.log(`✅ Successfully deleted ${stages.length} stages.`);
  } catch (error) {
    console.error('❌ Error deleting stages:', error);
  }
}

/**
 * Delete stages by specific criteria
 */
async function deleteStagesByCriteria() {
  const stages = await listAllStages();
  
  if (stages.length === 0) {
    console.log('✅ No stages found.');
    return;
  }
  
  // Define cleanup criteria
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
    
    // Delete duplicate stages (same title)
    const duplicates = stages.filter(s => s.title === stage.title);
    if (duplicates.length > 1) {
      // Keep the first one, delete the rest
      return duplicates.indexOf(stage) > 0;
    }
    
    return false;
  });
  
  if (stagesToDelete.length === 0) {
    console.log('✅ No stages need cleanup.');
    return;
  }
  
  console.log(`\n🧹 Found ${stagesToDelete.length} stages to clean up:`);
  stagesToDelete.forEach(stage => {
    console.log(`- ${stage.id}: "${stage.title}"`);
  });
  
  try {
    const batch = writeBatch(db);
    
    stagesToDelete.forEach((stage) => {
      const stageRef = doc(db, 'stages', stage.id);
      batch.delete(stageRef);
    });
    
    await batch.commit();
    console.log(`✅ Successfully cleaned up ${stagesToDelete.length} stages.`);
  } catch (error) {
    console.error('❌ Error cleaning up stages:', error);
  }
}

/**
 * Delete specific stages by ID
 */
async function deleteSpecificStages(stageIds) {
  if (!stageIds || stageIds.length === 0) {
    console.log('❌ No stage IDs provided.');
    return;
  }
  
  console.log(`🗑️  Deleting ${stageIds.length} specific stages...`);
  
  try {
    const batch = writeBatch(db);
    
    stageIds.forEach((stageId) => {
      const stageRef = doc(db, 'stages', stageId);
      batch.delete(stageRef);
    });
    
    await batch.commit();
    console.log(`✅ Successfully deleted ${stageIds.length} stages.`);
  } catch (error) {
    console.error('❌ Error deleting specific stages:', error);
  }
}

/**
 * Create sample stages for testing
 */
async function createSampleStages() {
  console.log('🌱 Creating sample stages...');
  
  const sampleStages = [
    {
      title: "Application Review",
      description: "Initial review of candidate application",
      color: "#3b82f6",
      jobId: "global",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      title: "Phone Screening",
      description: "Brief phone call to assess basic fit",
      color: "#10b981",
      jobId: "global",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      title: "Technical Interview",
      description: "In-depth technical assessment",
      color: "#f59e0b",
      jobId: "global",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      title: "Final Interview",
      description: "Final decision-making interview",
      color: "#ef4444",
      jobId: "global",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      title: "Offer",
      description: "Job offer extended to candidate",
      color: "#8b5cf6",
      jobId: "global",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  try {
    const batch = writeBatch(db);
    
    sampleStages.forEach((stage) => {
      const stageRef = doc(collection(db, 'stages'));
      batch.set(stageRef, stage);
    });
    
    await batch.commit();
    console.log(`✅ Successfully created ${sampleStages.length} sample stages.`);
  } catch (error) {
    console.error('❌ Error creating sample stages:', error);
  }
}

// Main execution
async function main() {
  console.log('🚀 Firestore Stages Cleanup Script\n');
  
  // Get command line arguments
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'list':
      await listAllStages();
      break;
      
    case 'cleanup':
      await deleteStagesByCriteria();
      break;
      
    case 'delete-all':
      console.log('⚠️  Are you sure you want to delete ALL stages? This cannot be undone!');
      console.log('⚠️  If you are sure, uncomment the line below and run again.');
      // await deleteAllStages();
      break;
      
    case 'delete-specific':
      const stageIds = args.slice(1);
      await deleteSpecificStages(stageIds);
      break;
      
    case 'create-samples':
      await createSampleStages();
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('  node cleanup-stages.js list                    # List all stages');
      console.log('  node cleanup-stages.js cleanup                # Clean up corrupted/duplicate stages');
      console.log('  node cleanup-stages.js delete-all             # Delete ALL stages (dangerous!)');
      console.log('  node cleanup-stages.js delete-specific <id1> <id2>  # Delete specific stages by ID');
      console.log('  node cleanup-stages.js create-samples         # Create sample stages for testing');
      break;
  }
  
  console.log('\n✨ Script completed!');
  process.exit(0);
}

// Run the script
main().catch(console.error);
