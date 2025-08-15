// scripts/workflow-migration.js
// Migration script to fix workflow data consistency issues

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where,
  writeBatch 
} = require('firebase/firestore');

// Firebase configuration - replace with your config
const firebaseConfig = {
  // Add your Firebase config here
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Migration script to fix workflow data consistency
 */
async function migrateWorkflowData() {
  console.log('🚀 Starting workflow data migration...');
  
  try {
    // Step 1: Migrate workflow_templates to workflowTemplates
    await migrateTemplateCollection();
    
    // Step 2: Ensure all stages have required order property
    await fixStageOrders();
    
    // Step 3: Fix workflow template references
    await fixTemplateStageReferences();
    
    // Step 4: Normalize stage colors (hex vs CSS classes)
    await normalizeStageColors();
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

/**
 * Migrate from workflow_templates to workflowTemplates collection
 */
async function migrateTemplateCollection() {
  console.log('📋 Migrating template collection...');
  
  try {
    // Check if old collection exists
    const oldCollectionRef = collection(db, 'workflow_templates');
    const oldSnapshot = await getDocs(oldCollectionRef);
    
    if (oldSnapshot.empty) {
      console.log('ℹ️  No old workflow_templates collection found, skipping migration');
      return;
    }
    
    // Check if new collection already has data
    const newCollectionRef = collection(db, 'workflowTemplates');
    const newSnapshot = await getDocs(newCollectionRef);
    
    if (!newSnapshot.empty) {
      console.log('ℹ️  New workflowTemplates collection already has data, skipping migration');
      return;
    }
    
    // Migrate data
    const batch = writeBatch(db);
    let migrationCount = 0;
    
    oldSnapshot.docs.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const newDocRef = doc(newCollectionRef, docSnapshot.id);
      
      // Convert old format to new format
      const migrationData = {
        ...data,
        // Ensure stageIds array exists
        stageIds: data.stageIds || data.stages?.map(s => s.stageId) || [],
        // Remove old stages array if it exists
        stages: undefined,
        // Add migration metadata
        migratedAt: new Date().toISOString(),
        migratedFrom: 'workflow_templates'
      };
      
      batch.set(newDocRef, migrationData);
      migrationCount++;
    });
    
    await batch.commit();
    console.log(`✅ Migrated ${migrationCount} templates to workflowTemplates collection`);
    
  } catch (error) {
    console.error('❌ Template collection migration failed:', error);
    throw error;
  }
}

/**
 * Ensure all stages have the required order property
 */
async function fixStageOrders() {
  console.log('🔢 Fixing stage orders...');
  
  try {
    const stagesRef = collection(db, 'stages');
    const snapshot = await getDocs(stagesRef);
    
    if (snapshot.empty) {
      console.log('ℹ️  No stages found, skipping order fix');
      return;
    }
    
    const batch = writeBatch(db);
    let fixCount = 0;
    let currentOrder = 1;
    
    // Sort stages by existing order or title
    const stages = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        if (a.order && b.order) return a.order - b.order;
        if (a.order) return -1;
        if (b.order) return 1;
        return (a.title || '').localeCompare(b.title || '');
      });
    
    stages.forEach((stage) => {
      if (!stage.order || typeof stage.order !== 'number') {
        const stageRef = doc(db, 'stages', stage.id);
        batch.update(stageRef, { 
          order: currentOrder,
          updatedAt: new Date().toISOString()
        });
        fixCount++;
      }
      currentOrder++;
    });
    
    if (fixCount > 0) {
      await batch.commit();
      console.log(`✅ Fixed order for ${fixCount} stages`);
    } else {
      console.log('ℹ️  All stages already have valid orders');
    }
    
  } catch (error) {
    console.error('❌ Stage order fix failed:', error);
    throw error;
  }
}

/**
 * Fix workflow template stage references
 */
async function fixTemplateStageReferences() {
  console.log('🔗 Fixing template stage references...');
  
  try {
    const templatesRef = collection(db, 'workflowTemplates');
    const templateSnapshot = await getDocs(templatesRef);
    
    if (templateSnapshot.empty) {
      console.log('ℹ️  No templates found, skipping reference fix');
      return;
    }
    
    // Get all stages for reference mapping
    const stagesRef = collection(db, 'stages');
    const stagesSnapshot = await getDocs(stagesRef);
    const stageMap = new Map();
    
    stagesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Map both by ID and by title (for legacy references)
      stageMap.set(doc.id, doc.id);
      if (data.title) {
        const titleKey = data.title.toLowerCase().replace(/\s+/g, '-');
        stageMap.set(titleKey, doc.id);
      }
    });
    
    const batch = writeBatch(db);
    let fixCount = 0;
    
    templateSnapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      let needsUpdate = false;
      let updatedStageIds = [];
      
      // Fix stageIds if they exist
      if (data.stageIds && Array.isArray(data.stageIds)) {
        updatedStageIds = data.stageIds
          .map(stageId => stageMap.get(stageId) || stageId)
          .filter(Boolean);
        
        if (updatedStageIds.length !== data.stageIds.length) {
          needsUpdate = true;
        }
      }
      
      // Fix legacy stages array if it exists
      if (data.stages && Array.isArray(data.stages)) {
        const legacyStageIds = data.stages
          .map(stage => stageMap.get(stage.stageId) || stageMap.get(stage.stageId?.toLowerCase?.().replace(/\s+/g, '-')))
          .filter(Boolean);
        
        if (legacyStageIds.length > 0) {
          updatedStageIds = [...new Set([...updatedStageIds, ...legacyStageIds])];
          needsUpdate = true;
        }
      }
      
      if (needsUpdate && updatedStageIds.length > 0) {
        const templateRef = doc(db, 'workflowTemplates', docSnapshot.id);
        batch.update(templateRef, {
          stageIds: updatedStageIds,
          stages: undefined, // Remove legacy stages array
          updatedAt: new Date().toISOString()
        });
        fixCount++;
      }
    });
    
    if (fixCount > 0) {
      await batch.commit();
      console.log(`✅ Fixed stage references for ${fixCount} templates`);
    } else {
      console.log('ℹ️  All template references are already valid');
    }
    
  } catch (error) {
    console.error('❌ Template reference fix failed:', error);
    throw error;
  }
}

/**
 * Normalize stage colors to hex format
 */
async function normalizeStageColors() {
  console.log('🎨 Normalizing stage colors...');
  
  try {
    const stagesRef = collection(db, 'stages');
    const snapshot = await getDocs(stagesRef);
    
    if (snapshot.empty) {
      console.log('ℹ️  No stages found, skipping color normalization');
      return;
    }
    
    // CSS class to hex mapping
    const cssToHex = {
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
    
    const batch = writeBatch(db);
    let fixCount = 0;
    
    snapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      let needsUpdate = false;
      
      // Check if color needs normalization
      if (data.color && cssToHex[data.color]) {
        const stageRef = doc(db, 'stages', docSnapshot.id);
        batch.update(stageRef, {
          color: cssToHex[data.color],
          originalColor: data.color, // Keep original for reference
          updatedAt: new Date().toISOString()
        });
        fixCount++;
      }
    });
    
    if (fixCount > 0) {
      await batch.commit();
      console.log(`✅ Normalized colors for ${fixCount} stages`);
    } else {
      console.log('ℹ️  All stage colors are already normalized');
    }
    
  } catch (error) {
    console.error('❌ Color normalization failed:', error);
    throw error;
  }
}

/**
 * Validation function to check data integrity after migration
 */
async function validateMigration() {
  console.log('🔍 Validating migration results...');
  
  const issues = [];
  
  try {
    // Check stages
    const stagesRef = collection(db, 'stages');
    const stagesSnapshot = await getDocs(stagesRef);
    
    stagesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.order || typeof data.order !== 'number') {
        issues.push(`Stage ${doc.id} missing valid order property`);
      }
      if (!data.color) {
        issues.push(`Stage ${doc.id} missing color property`);
      }
    });
    
    // Check templates
    const templatesRef = collection(db, 'workflowTemplates');
    const templatesSnapshot = await getDocs(templatesRef);
    
    templatesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.stageIds || !Array.isArray(data.stageIds) || data.stageIds.length === 0) {
        issues.push(`Template ${doc.id} missing valid stageIds array`);
      }
    });
    
    if (issues.length === 0) {
      console.log('✅ Migration validation passed - no issues found');
    } else {
      console.log('⚠️  Migration validation found issues:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    return issues.length === 0;
    
  } catch (error) {
    console.error('❌ Migration validation failed:', error);
    return false;
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateWorkflowData()
    .then(() => validateMigration())
    .then((isValid) => {
      if (isValid) {
        console.log('🎉 Migration completed successfully with no issues!');
        process.exit(0);
      } else {
        console.log('⚠️  Migration completed but validation found issues');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = {
  migrateWorkflowData,
  validateMigration
};
