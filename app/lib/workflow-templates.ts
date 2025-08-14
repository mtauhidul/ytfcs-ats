// Predefined workflow templates for different job types
export const DEFAULT_WORKFLOW_TEMPLATES = [
  {
    name: "Standard Hiring Process",
    description: "A comprehensive workflow for most positions",
    category: "General",
    isDefault: true,
    stages: [
      {
        title: "Applied",
        order: 1,
        color: "bg-blue-50 border-blue-200 text-blue-700",
        description: "Candidate has submitted their application"
      },
      {
        title: "Initial Review",
        order: 2,
        color: "bg-yellow-50 border-yellow-200 text-yellow-700",
        description: "HR team reviews the application"
      },
      {
        title: "Phone Screen",
        order: 3,
        color: "bg-orange-50 border-orange-200 text-orange-700",
        description: "Initial phone or video screening"
      },
      {
        title: "Technical Interview",
        order: 4,
        color: "bg-purple-50 border-purple-200 text-purple-700",
        description: "Technical skills assessment"
      },
      {
        title: "Final Interview",
        order: 5,
        color: "bg-indigo-50 border-indigo-200 text-indigo-700",
        description: "Final interview with hiring manager"
      },
      {
        title: "Background Check",
        order: 6,
        color: "bg-gray-50 border-gray-200 text-gray-700",
        description: "Reference and background verification"
      },
      {
        title: "Offer",
        order: 7,
        color: "bg-green-50 border-green-200 text-green-700",
        description: "Job offer extended to candidate"
      },
      {
        title: "Hired",
        order: 8,
        color: "bg-emerald-50 border-emerald-200 text-emerald-700",
        description: "Candidate has accepted and joined"
      }
    ]
  },
  {
    name: "Engineering Workflow",
    description: "Specialized workflow for engineering positions",
    category: "Engineering",
    isDefault: false,
    stages: [
      {
        title: "Applied",
        order: 1,
        color: "bg-blue-50 border-blue-200 text-blue-700",
        description: "Candidate submitted application"
      },
      {
        title: "Resume Review",
        order: 2,
        color: "bg-yellow-50 border-yellow-200 text-yellow-700",
        description: "Technical recruiter reviews resume"
      },
      {
        title: "Coding Challenge",
        order: 3,
        color: "bg-orange-50 border-orange-200 text-orange-700",
        description: "Take-home coding assignment"
      },
      {
        title: "Technical Screen",
        order: 4,
        color: "bg-red-50 border-red-200 text-red-700",
        description: "Live coding and technical discussion"
      },
      {
        title: "System Design",
        order: 5,
        color: "bg-purple-50 border-purple-200 text-purple-700",
        description: "System design interview"
      },
      {
        title: "Team Interview",
        order: 6,
        color: "bg-indigo-50 border-indigo-200 text-indigo-700",
        description: "Meet with potential team members"
      },
      {
        title: "Manager Interview",
        order: 7,
        color: "bg-violet-50 border-violet-200 text-violet-700",
        description: "Interview with hiring manager"
      },
      {
        title: "Offer",
        order: 8,
        color: "bg-green-50 border-green-200 text-green-700",
        description: "Job offer extended"
      }
    ]
  },
  {
    name: "Sales Workflow",
    description: "Optimized for sales and business development roles",
    category: "Sales",
    isDefault: false,
    stages: [
      {
        title: "Applied",
        order: 1,
        color: "bg-blue-50 border-blue-200 text-blue-700",
        description: "Initial application received"
      },
      {
        title: "Screening",
        order: 2,
        color: "bg-yellow-50 border-yellow-200 text-yellow-700",
        description: "Phone screening call"
      },
      {
        title: "Sales Assessment",
        order: 3,
        color: "bg-orange-50 border-orange-200 text-orange-700",
        description: "Sales skills and personality assessment"
      },
      {
        title: "Role Play",
        order: 4,
        color: "bg-red-50 border-red-200 text-red-700",
        description: "Sales scenario simulation"
      },
      {
        title: "Team Interview",
        order: 5,
        color: "bg-purple-50 border-purple-200 text-purple-700",
        description: "Meet the sales team"
      },
      {
        title: "Final Interview",
        order: 6,
        color: "bg-indigo-50 border-indigo-200 text-indigo-700",
        description: "Interview with sales director"
      },
      {
        title: "Offer",
        order: 7,
        color: "bg-green-50 border-green-200 text-green-700",
        description: "Job offer and negotiation"
      }
    ]
  },
  {
    name: "Executive Workflow",
    description: "For C-level and senior executive positions",
    category: "Executive",
    isDefault: false,
    stages: [
      {
        title: "Applied",
        order: 1,
        color: "bg-blue-50 border-blue-200 text-blue-700",
        description: "Executive search initiated"
      },
      {
        title: "Initial Assessment",
        order: 2,
        color: "bg-yellow-50 border-yellow-200 text-yellow-700",
        description: "Executive recruiter evaluation"
      },
      {
        title: "Board Preview",
        order: 3,
        color: "bg-orange-50 border-orange-200 text-orange-700",
        description: "Board members preview candidate"
      },
      {
        title: "Executive Interview",
        order: 4,
        color: "bg-purple-50 border-purple-200 text-purple-700",
        description: "Interview with C-suite executives"
      },
      {
        title: "Board Interview",
        order: 5,
        color: "bg-indigo-50 border-indigo-200 text-indigo-700",
        description: "Formal board interview"
      },
      {
        title: "Due Diligence",
        order: 6,
        color: "bg-gray-50 border-gray-200 text-gray-700",
        description: "Comprehensive background check"
      },
      {
        title: "Offer",
        order: 7,
        color: "bg-green-50 border-green-200 text-green-700",
        description: "Executive compensation package"
      }
    ]
  },
  {
    name: "Fast Track",
    description: "Simplified workflow for urgent hiring",
    category: "Urgent",
    isDefault: false,
    stages: [
      {
        title: "Applied",
        order: 1,
        color: "bg-blue-50 border-blue-200 text-blue-700",
        description: "Application received"
      },
      {
        title: "Quick Screen",
        order: 2,
        color: "bg-yellow-50 border-yellow-200 text-yellow-700",
        description: "15-minute screening call"
      },
      {
        title: "Interview",
        order: 3,
        color: "bg-orange-50 border-orange-200 text-orange-700",
        description: "Combined technical and cultural interview"
      },
      {
        title: "Decision",
        order: 4,
        color: "bg-purple-50 border-purple-200 text-purple-700",
        description: "Go/No-go decision"
      },
      {
        title: "Offer",
        order: 5,
        color: "bg-green-50 border-green-200 text-green-700",
        description: "Immediate offer if approved"
      }
    ]
  },
  {
    name: "Internship Workflow",
    description: "Simplified process for internship positions",
    category: "Internship",
    isDefault: false,
    stages: [
      {
        title: "Applied",
        order: 1,
        color: "bg-blue-50 border-blue-200 text-blue-700",
        description: "Internship application received"
      },
      {
        title: "Portfolio Review",
        order: 2,
        color: "bg-yellow-50 border-yellow-200 text-yellow-700",
        description: "Review academic work and projects"
      },
      {
        title: "Phone Interview",
        order: 3,
        color: "bg-orange-50 border-orange-200 text-orange-700",
        description: "Brief phone or video interview"
      },
      {
        title: "Skills Assessment",
        order: 4,
        color: "bg-purple-50 border-purple-200 text-purple-700",
        description: "Practical skills evaluation"
      },
      {
        title: "Team Meet",
        order: 5,
        color: "bg-indigo-50 border-indigo-200 text-indigo-700",
        description: "Meet potential mentor and team"
      },
      {
        title: "Offer",
        order: 6,
        color: "bg-green-50 border-green-200 text-green-700",
        description: "Internship offer"
      }
    ]
  }
];

// Function to initialize default templates in Firestore
export const initializeDefaultTemplates = async (db: any) => {
  try {
    // Check if templates already exist
    const { getDocs, collection } = await import("firebase/firestore");
    const templatesSnapshot = await getDocs(collection(db, "workflow_templates"));
    
    if (templatesSnapshot.empty) {
      // Add default templates
      const { addDoc } = await import("firebase/firestore");
      const promises = DEFAULT_WORKFLOW_TEMPLATES.map(template => 
        addDoc(collection(db, "workflow_templates"), {
          ...template,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      );
      
      await Promise.all(promises);
      console.log("Default workflow templates initialized");
    }
  } catch (error) {
    console.error("Error initializing default templates:", error);
  }
};

// Utility functions for workflow management
export const getStageByTitle = (stages: any[], title: string) => {
  return stages.find(stage => stage.title.toLowerCase() === title.toLowerCase());
};

export const getNextStage = (stages: any[], currentStageId: string) => {
  const currentIndex = stages.findIndex(stage => stage.id === currentStageId);
  return currentIndex !== -1 && currentIndex < stages.length - 1 
    ? stages[currentIndex + 1] 
    : null;
};

export const getPreviousStage = (stages: any[], currentStageId: string) => {
  const currentIndex = stages.findIndex(stage => stage.id === currentStageId);
  return currentIndex > 0 ? stages[currentIndex - 1] : null;
};

export const validateWorkflowStages = (stages: any[]) => {
  const errors = [];
  
  if (stages.length === 0) {
    errors.push("Workflow must have at least one stage");
  }
  
  const orders = stages.map(s => s.order);
  const duplicateOrders = orders.filter((order, index) => orders.indexOf(order) !== index);
  if (duplicateOrders.length > 0) {
    errors.push("Stage orders must be unique");
  }
  
  const titles = stages.map(s => s.title);
  const duplicateTitles = titles.filter((title, index) => titles.indexOf(title) !== index);
  if (duplicateTitles.length > 0) {
    errors.push("Stage titles must be unique");
  }
  
  return errors;
};
