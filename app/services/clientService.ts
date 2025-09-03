// app/services/clientService.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "~/lib/firebase";
import type { 
  Client, 
  ClientBasic, 
  ClientFeedback, 
  ClientStats,
  ClientCommunicationEntry 
} from "~/types/client";

class ClientService {
  private readonly COLLECTION = "clients";
  private readonly FEEDBACK_COLLECTION = "clientFeedbacks";
  private readonly COMMUNICATION_COLLECTION = "clientCommunications";

  // Client CRUD Operations
  async createClient(clientData: Omit<Client, "id" | "createdAt" | "updatedAt">): Promise<Client> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION), {
        ...clientData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activeJobs: 0,
        totalCandidatesSubmitted: 0,
        totalHires: 0,
      });

      return {
        id: docRef.id,
        ...clientData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activeJobs: 0,
        totalCandidatesSubmitted: 0,
        totalHires: 0,
      };
    } catch (error) {
      console.error("Error creating client:", error);
      throw new Error("Failed to create client");
    }
  }

  async updateClient(clientId: string, updates: Partial<Client>): Promise<void> {
    try {
      const clientRef = doc(db, this.COLLECTION, clientId);
      await updateDoc(clientRef, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating client:", error);
      throw new Error("Failed to update client");
    }
  }

  async getClient(clientId: string): Promise<Client | null> {
    try {
      const clientDoc = await getDoc(doc(db, this.COLLECTION, clientId));
      if (!clientDoc.exists()) return null;

      return {
        id: clientDoc.id,
        ...clientDoc.data(),
      } as Client;
    } catch (error) {
      console.error("Error fetching client:", error);
      throw new Error("Failed to fetch client");
    }
  }

  async getAllClients(): Promise<Client[]> {
    try {
      const q = query(collection(db, this.COLLECTION), orderBy("name"));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Client[];
    } catch (error) {
      console.error("Error fetching clients:", error);
      throw new Error("Failed to fetch clients");
    }
  }

  async getActiveClients(): Promise<ClientBasic[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where("status", "==", "active"),
        orderBy("name")
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          companyName: data.companyName,
          contactEmail: data.contactEmail,
          status: data.status,
        };
      }) as ClientBasic[];
    } catch (error) {
      console.error("Error fetching active clients:", error);
      throw new Error("Failed to fetch active clients");
    }
  }

  async deleteClient(clientId: string): Promise<void> {
    try {
      // Check if client has active jobs
      const jobsQuery = query(
        collection(db, "jobs"),
        where("clientId", "==", clientId)
      );
      const jobsSnapshot = await getDocs(jobsQuery);

      if (!jobsSnapshot.empty) {
        throw new Error("Cannot delete client with active jobs. Please reassign or delete jobs first.");
      }

      // Delete client and related data
      const batch = writeBatch(db);
      
      // Delete client document
      batch.delete(doc(db, this.COLLECTION, clientId));
      
      // Delete feedback records
      const feedbackQuery = query(
        collection(db, this.FEEDBACK_COLLECTION),
        where("clientId", "==", clientId)
      );
      const feedbackSnapshot = await getDocs(feedbackQuery);
      feedbackSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete communication records
      const commQuery = query(
        collection(db, this.COMMUNICATION_COLLECTION),
        where("clientId", "==", clientId)
      );
      const commSnapshot = await getDocs(commQuery);
      commSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error("Error deleting client:", error);
      throw error;
    }
  }

  // Feedback Management
  async addClientFeedback(
    clientId: string,
    feedbackData: Omit<ClientFeedback, "id" | "createdAt">
  ): Promise<ClientFeedback> {
    try {
      const docRef = await addDoc(collection(db, this.FEEDBACK_COLLECTION), {
        ...feedbackData,
        clientId,
        createdAt: new Date().toISOString(),
      });

      return {
        id: docRef.id,
        ...feedbackData,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error adding client feedback:", error);
      throw new Error("Failed to add client feedback");
    }
  }

  async getClientFeedback(clientId: string): Promise<ClientFeedback[]> {
    try {
      const q = query(
        collection(db, this.FEEDBACK_COLLECTION),
        where("clientId", "==", clientId),
        orderBy("feedbackDate", "desc")
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ClientFeedback[];
    } catch (error) {
      console.error("Error fetching client feedback:", error);
      throw new Error("Failed to fetch client feedback");
    }
  }

  // Communication Logging
  async logCommunication(
    clientId: string,
    commData: Omit<ClientCommunicationEntry, "id" | "createdAt">
  ): Promise<ClientCommunicationEntry> {
    try {
      const docRef = await addDoc(collection(db, this.COMMUNICATION_COLLECTION), {
        ...commData,
        clientId,
        createdAt: new Date().toISOString(),
      });

      return {
        id: docRef.id,
        ...commData,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error logging communication:", error);
      throw new Error("Failed to log communication");
    }
  }

  async getClientCommunications(clientId: string): Promise<ClientCommunicationEntry[]> {
    try {
      const q = query(
        collection(db, this.COMMUNICATION_COLLECTION),
        where("clientId", "==", clientId),
        orderBy("date", "desc")
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ClientCommunicationEntry[];
    } catch (error) {
      console.error("Error fetching client communications:", error);
      throw new Error("Failed to fetch client communications");
    }
  }

  // Analytics & Reporting
  async getClientStats(): Promise<ClientStats> {
    try {
      const clientsSnapshot = await getDocs(collection(db, this.COLLECTION));
      const totalClients = clientsSnapshot.size;
      
      const activeClientsSnapshot = await getDocs(
        query(collection(db, this.COLLECTION), where("status", "==", "active"))
      );
      const activeClients = activeClientsSnapshot.size;

      // Calculate other stats from jobs and candidates collections
      const jobsSnapshot = await getDocs(collection(db, "jobs"));
      const totalJobsAssigned = jobsSnapshot.size;

      return {
        totalClients,
        activeClients,
        totalJobsAssigned,
        averageCandidatesPerJob: 0, // Calculate from actual data
        successRate: 0, // Calculate from actual data
      };
    } catch (error) {
      console.error("Error calculating client stats:", error);
      throw new Error("Failed to calculate client stats");
    }
  }

  async getClientJobsAndCandidates(clientId: string) {
    try {
      // Get all jobs for this client
      const jobsQuery = query(
        collection(db, "jobs"),
        where("clientId", "==", clientId)
      );
      const jobsSnapshot = await getDocs(jobsQuery);
      const jobs = jobsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get all candidates for these jobs
      const jobIds = jobs.map((job) => job.id);
      let candidates: any[] = [];
      
      if (jobIds.length > 0) {
        // Note: Firebase doesn't support array-contains for multiple values
        // We'll need to query candidates and filter on the client side
        const candidatesSnapshot = await getDocs(collection(db, "candidates"));
        candidates = candidatesSnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((candidate: any) => jobIds.includes(candidate.jobId));
      }

      return { jobs, candidates };
    } catch (error) {
      console.error("Error fetching client jobs and candidates:", error);
      throw new Error("Failed to fetch client data");
    }
  }

  // Real-time subscriptions
  subscribeToClients(callback: (clients: Client[]) => void) {
    const q = query(collection(db, this.COLLECTION), orderBy("name"));
    return onSnapshot(q, (snapshot) => {
      const clients = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Client[];
      callback(clients);
    });
  }

  subscribeToClientFeedback(clientId: string, callback: (feedback: ClientFeedback[]) => void) {
    const q = query(
      collection(db, this.FEEDBACK_COLLECTION),
      where("clientId", "==", clientId),
      orderBy("feedbackDate", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      const feedback = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ClientFeedback[];
      callback(feedback);
    });
  }
}

export const clientService = new ClientService();
