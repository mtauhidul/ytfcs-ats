// app/services/emailService.js
import { API_URL } from "./config";

// Get the API key from environment variables
const API_KEY = import.meta.env.VITE_API_KEY;

// Helper function to create headers with API key
const getHeaders = () => ({
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
});

export const emailService = {
  // Send notification when candidate is assigned to team member
  sendAssignmentNotification: async (data: { [key: string]: any }) => {
    const response = await fetch(
      `${API_URL}/api/email/notifications/assignment`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to send assignment notification");
    }

    return response.json();
  },

  // Send invitation or update to team member
  sendTeamMemberNotification: async (data: { [key: string]: any }) => {
    const response = await fetch(
      `${API_URL}/api/email/notifications/team-member`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to send team member notification");
    }

    return response.json();
  },

  // Send communication to candidate
  sendCandidateEmail: async (data: { [key: string]: any }) => {
    const response = await fetch(`${API_URL}/api/email/communications/send`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to send candidate email");
    }

    return response.json();
  },

  // Import candidates from email
  importCandidatesFromEmail: async (credentials: { [key: string]: any }) => {
    const response = await fetch(`${API_URL}/api/email/import/candidates`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error("Failed to import candidates from email");
    }

    return response.json();
  },
};
