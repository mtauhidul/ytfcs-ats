// app/lib/workflow-templates-seeder.ts

import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "~/lib/firebase";

export const defaultWorkflowTemplates = [
  {
    name: "Standard Hiring Process",
    description: "A comprehensive hiring workflow suitable for most positions",
    category: "General",
    stages: [
      { stageId: "applied", order: 1 },
      { stageId: "screening", order: 2 },
      { stageId: "phone-interview", order: 3 },
      { stageId: "technical-interview", order: 4 },
      { stageId: "final-interview", order: 5 },
      { stageId: "offer", order: 6 },
    ],
    isDefault: true,
  },
  {
    name: "Engineering Workflow",
    description: "Technical hiring process for engineering roles",
    category: "Engineering",
    stages: [
      { stageId: "applied", order: 1 },
      { stageId: "resume-review", order: 2 },
      { stageId: "coding-assessment", order: 3 },
      { stageId: "technical-interview", order: 4 },
      { stageId: "system-design", order: 5 },
      { stageId: "team-interview", order: 6 },
      { stageId: "offer", order: 7 },
    ],
    isDefault: true,
  },
  {
    name: "Sales Workflow",
    description: "Optimized process for sales and business development roles",
    category: "Sales",
    stages: [
      { stageId: "applied", order: 1 },
      { stageId: "phone-screening", order: 2 },
      { stageId: "sales-presentation", order: 3 },
      { stageId: "role-play", order: 4 },
      { stageId: "final-interview", order: 5 },
      { stageId: "offer", order: 6 },
    ],
    isDefault: true,
  },
  {
    name: "Quick Hire",
    description: "Streamlined process for urgent or entry-level positions",
    category: "General",
    stages: [
      { stageId: "applied", order: 1 },
      { stageId: "phone-screening", order: 2 },
      { stageId: "interview", order: 3 },
      { stageId: "offer", order: 4 },
    ],
    isDefault: false,
  },
  {
    name: "Executive Search",
    description: "Comprehensive process for senior leadership positions",
    category: "Executive",
    stages: [
      { stageId: "applied", order: 1 },
      { stageId: "initial-screening", order: 2 },
      { stageId: "first-interview", order: 3 },
      { stageId: "assessment-center", order: 4 },
      { stageId: "panel-interview", order: 5 },
      { stageId: "reference-check", order: 6 },
      { stageId: "final-interview", order: 7 },
      { stageId: "offer", order: 8 },
    ],
    isDefault: false,
  },
];

export const defaultStages = [
  { title: "Applied", color: "#3b82f6", order: 1 },
  { title: "Resume Review", color: "#8b5cf6", order: 2 },
  { title: "Phone Screening", color: "#f59e0b", order: 3 },
  { title: "Initial Screening", color: "#f59e0b", order: 4 },
  { title: "Coding Assessment", color: "#ef4444", order: 5 },
  { title: "Technical Interview", color: "#06b6d4", order: 6 },
  { title: "System Design", color: "#8b5cf6", order: 7 },
  { title: "Team Interview", color: "#10b981", order: 8 },
  { title: "Panel Interview", color: "#f97316", order: 9 },
  { title: "Sales Presentation", color: "#06b6d4", order: 10 },
  { title: "Role Play", color: "#8b5cf6", order: 11 },
  { title: "Assessment Center", color: "#ef4444", order: 12 },
  { title: "Reference Check", color: "#84cc16", order: 13 },
  { title: "First Interview", color: "#10b981", order: 14 },
  { title: "Phone Interview", color: "#f59e0b", order: 15 },
  { title: "Interview", color: "#10b981", order: 16 },
  { title: "Final Interview", color: "#f97316", order: 17 },
  { title: "Final Review", color: "#f97316", order: 18 },
  { title: "Offer", color: "#22c55e", order: 19 },
  { title: "Rejected", color: "#ef4444", order: 20 },
  { title: "Withdrawn", color: "#6b7280", order: 21 },
];

// Seed the database with default stages and templates - DISABLED TO PREVENT AUTO-POPULATION
export async function seedWorkflowData() {
  try {
    console.log("Auto-seeding disabled to prevent unwanted data population");
    return { success: true, message: "Auto-seeding disabled" };
  } catch (error) {
    console.error("Error in disabled seeder:", error);
    return { success: false, error };
  }
}

// Function to call from the UI to initialize data - DISABLED
export function initializeWorkflowData() {
  console.log("Manual data initialization disabled - create stages manually");
  return { success: true, message: "Auto-initialization disabled" };
}
