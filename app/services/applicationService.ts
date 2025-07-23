// app/services/applicationService.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { Application } from "~/types/application";

export const applicationService = {
  // Create new application
  async createApplication(
    applicationData: Omit<Application, "id">
  ): Promise<string> {
    try {
      const docRef = await addDoc(
        collection(db, "applications"),
        applicationData
      );
      return docRef.id;
    } catch (error) {
      console.error("Error creating application:", error);
      throw error;
    }
  },

  // Update application status
  async updateApplicationStatus(
    applicationId: string,
    status: "pending" | "approved" | "rejected",
    reviewData?: {
      reviewedBy?: string;
      rejectionReason?: string;
    }
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        reviewedAt: new Date().toISOString(),
        ...reviewData,
      };

      await updateDoc(doc(db, "applications", applicationId), updateData);
    } catch (error) {
      console.error("Error updating application:", error);
      throw error;
    }
  },

  // Delete application
  async deleteApplication(applicationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, "applications", applicationId));
    } catch (error) {
      console.error("Error deleting application:", error);
      throw error;
    }
  },

  // Get applications by status
  async getApplicationsByStatus(status: string): Promise<Application[]> {
    try {
      const q = query(
        collection(db, "applications"),
        where("status", "==", status)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Application[];
    } catch (error) {
      console.error("Error fetching applications:", error);
      throw error;
    }
  },

  // Parse resume data (mock implementation)
  parseResumeData(
    fileName: string,
    fileContent?: string
  ): Application["extractedData"] {
    // This is a mock implementation
    // In a real app, you would use an AI service or resume parsing library
    const extractedData: Application["extractedData"] = {};

    // Simple name extraction from filename
    const nameMatch = fileName.match(/^([^_-]+(?:\s+[^_-]+)*)/);
    if (nameMatch) {
      extractedData.name = nameMatch[1].replace(/\.[^/.]+$/, "").trim();
    }

    // Mock email extraction (in real implementation, you'd parse the file content)
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    if (fileContent) {
      const emailMatch = fileContent.match(emailPattern);
      if (emailMatch) {
        extractedData.email = emailMatch[1];
      }
    }

    // Mock phone extraction
    const phonePattern = /(\+?[\d\s\-\(\)]{10,})/;
    if (fileContent) {
      const phoneMatch = fileContent.match(phonePattern);
      if (phoneMatch) {
        extractedData.phone = phoneMatch[1];
      }
    }

    // Mock skills extraction
    const commonSkills = [
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
      "Python",
      "Java",
      "CSS",
      "HTML",
      "SQL",
      "Git",
      "AWS",
      "Docker",
      "Kubernetes",
    ];

    if (fileContent) {
      const foundSkills = commonSkills.filter((skill) =>
        fileContent.toLowerCase().includes(skill.toLowerCase())
      );
      if (foundSkills.length > 0) {
        extractedData.skills = foundSkills;
      }
    }

    // Mock experience extraction
    const experiencePattern =
      /(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i;
    if (fileContent) {
      const expMatch = fileContent.match(experiencePattern);
      if (expMatch) {
        extractedData.experience = `${expMatch[1]} years`;
      }
    }

    return extractedData;
  },

  // Validate file type and size
  validateFile(file: File): { isValid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error:
          "Invalid file type. Please upload PDF, DOC, DOCX, or TXT files only.",
      };
    }

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: "File size too large. Please upload files smaller than 10MB.",
      };
    }

    return { isValid: true };
  },
};
