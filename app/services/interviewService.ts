// app/services/interviewService.ts
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { Interview, InterviewFeedback } from "~/types";

class InterviewService {
  // Interview CRUD operations
  async scheduleInterview(
    interviewData: Omit<Interview, "id" | "createdAt" | "updatedAt">
  ): Promise<Interview> {
    try {
      const docRef = await addDoc(collection(db, "interviews"), {
        ...interviewData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return {
        id: docRef.id,
        ...interviewData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error scheduling interview:", error);
      throw new Error("Failed to schedule interview");
    }
  }

  async updateInterviewStatus(
    interviewId: string,
    status: Interview["status"],
    outcome?: Interview["outcome"]
  ): Promise<void> {
    try {
      const interviewRef = doc(db, "interviews", interviewId);
      const updateData: any = {
        status,
        updatedAt: new Date().toISOString(),
      };

      if (outcome) {
        updateData.outcome = outcome;
      }

      await updateDoc(interviewRef, updateData);
    } catch (error) {
      console.error("Error updating interview status:", error);
      throw new Error("Failed to update interview status");
    }
  }

  async getInterviewsForCandidate(candidateId: string): Promise<Interview[]> {
    try {
      const q = query(
        collection(db, "interviews"),
        where("candidateId", "==", candidateId),
        orderBy("scheduledDate", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Interview[];
    } catch (error) {
      console.error("Error fetching candidate interviews:", error);
      throw new Error("Failed to fetch interviews");
    }
  }

  async getInterviewsForInterviewer(
    interviewerId: string
  ): Promise<Interview[]> {
    try {
      const q = query(
        collection(db, "interviews"),
        where("interviewerId", "==", interviewerId),
        orderBy("scheduledDate", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Interview[];
    } catch (error) {
      console.error("Error fetching interviewer interviews:", error);
      throw new Error("Failed to fetch interviews");
    }
  }

  // Feedback CRUD operations
  async submitFeedback(
    feedbackData: Omit<InterviewFeedback, "id" | "createdAt" | "updatedAt">
  ): Promise<InterviewFeedback> {
    try {
      const docRef = await addDoc(collection(db, "interviewFeedbacks"), {
        ...feedbackData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update the interview record with feedback ID
      if (feedbackData.interviewId) {
        await this.linkFeedbackToInterview(feedbackData.interviewId, docRef.id);
      }

      return {
        id: docRef.id,
        ...feedbackData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error submitting feedback:", error);
      throw new Error("Failed to submit feedback");
    }
  }

  async getFeedbackForInterview(
    interviewId: string
  ): Promise<InterviewFeedback | null> {
    try {
      const q = query(
        collection(db, "interviewFeedbacks"),
        where("interviewId", "==", interviewId)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as InterviewFeedback;
    } catch (error) {
      console.error("Error fetching interview feedback:", error);
      throw new Error("Failed to fetch feedback");
    }
  }

  async getFeedbackForCandidate(
    candidateId: string
  ): Promise<InterviewFeedback[]> {
    try {
      const q = query(
        collection(db, "interviewFeedbacks"),
        where("candidateId", "==", candidateId),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as InterviewFeedback[];
    } catch (error) {
      console.error("Error fetching candidate feedback:", error);
      throw new Error("Failed to fetch feedback");
    }
  }

  // Utility methods
  private async linkFeedbackToInterview(
    interviewId: string,
    feedbackId: string
  ): Promise<void> {
    try {
      const interviewRef = doc(db, "interviews", interviewId);
      await updateDoc(interviewRef, {
        feedbackId,
        status: "completed",
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error linking feedback to interview:", error);
      // Don't throw here, as the feedback was already saved
    }
  }

  async checkDuplicateInterview(
    candidateId: string,
    interviewerId: string
  ): Promise<Interview[]> {
    try {
      const q = query(
        collection(db, "interviews"),
        where("candidateId", "==", candidateId),
        where("interviewerId", "==", interviewerId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Interview[];
    } catch (error) {
      console.error("Error checking duplicate interviews:", error);
      return [];
    }
  }

  async getInterviewStatistics(candidateId: string) {
    try {
      const interviews = await this.getInterviewsForCandidate(candidateId);
      const feedbacks = await this.getFeedbackForCandidate(candidateId);

      const completed = interviews.filter(
        (i) => i.status === "completed"
      ).length;
      const pending = interviews.filter((i) => i.status === "scheduled").length;
      const averageRating =
        feedbacks.length > 0
          ? feedbacks.reduce((sum, f) => sum + f.overallRating, 0) /
            feedbacks.length
          : 0;

      return {
        totalInterviews: interviews.length,
        completedInterviews: completed,
        pendingInterviews: pending,
        averageRating,
        lastInterviewDate: interviews[0]?.scheduledDate,
        lastInterviewOutcome: interviews[0]?.outcome,
      };
    } catch (error) {
      console.error("Error calculating interview statistics:", error);
      throw new Error("Failed to calculate statistics");
    }
  }
}

export const interviewService = new InterviewService();
