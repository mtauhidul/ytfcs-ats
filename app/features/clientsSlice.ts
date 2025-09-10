import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Client } from "../types/client";
import type { Job } from "../types/job";
import type { Candidate } from "../types/candidate";
import { clientService } from "../services/clientService";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc,
  where
} from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import { db } from "../lib/firebase";

// Enhanced client interface with related data
export interface ClientWithRelatedData extends Client {
  jobs?: Job[];
  candidates?: Candidate[];
  recentFeedback?: any[];
  recentCommunications?: any[];
  totalJobs?: number;
  totalCandidates?: number;
  totalHires?: number;
  activeCandidates?: number;
}

interface ClientsState {
  clients: ClientWithRelatedData[];
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  realtimeListeners: {
    clients: Unsubscribe | null;
    jobs: Unsubscribe | null;
    candidates: Unsubscribe | null;
    feedback: Unsubscribe | null;
    communications: Unsubscribe | null;
  };
}

const initialState: ClientsState = {
  clients: [],
  isLoading: false,
  error: null,
  lastFetch: null,
  realtimeListeners: {
    clients: null,
    jobs: null,
    candidates: null,
    feedback: null,
    communications: null,
  },
};

// Async thunk for initial data fetch
export const fetchClientsWithRelatedData = createAsyncThunk(
  "clients/fetchClientsWithRelatedData",
  async (_, { rejectWithValue }) => {
    try {
      const clients = await clientService.getAllClients();
      
      // Fetch related data for all clients in parallel
      const clientsWithData = await Promise.all(
        clients.map(async (client: Client) => {
          try {
            const [jobsAndCandidates, feedback, communications] = await Promise.all([
              clientService.getClientJobsAndCandidates(client.id),
              clientService.getClientFeedback(client.id),
              clientService.getClientCommunications(client.id),
            ]);

            const jobs = jobsAndCandidates.jobs || [];
            const candidates = jobsAndCandidates.candidates || [];
            const totalHires = candidates?.filter((c: any) => c.status === "hired").length || 0;
            const activeCandidates = candidates?.filter((c: any) => 
              c.status && ["applied", "interviewing", "offer_extended"].includes(c.status)
            ).length || 0;

            return {
              ...client,
              jobs,
              candidates,
              recentFeedback: feedback || [],
              recentCommunications: communications || [],
              totalJobs: jobs?.length || 0,
              totalCandidates: candidates?.length || 0,
              totalHires,
              activeCandidates,
            };
          } catch (error) {
            console.warn(`Failed to fetch related data for client ${client.id}:`, error);
            return {
              ...client,
              jobs: [],
              candidates: [],
              recentFeedback: [],
              recentCommunications: [],
              totalJobs: 0,
              totalCandidates: 0,
              totalHires: 0,
              activeCandidates: 0,
            };
          }
        })
      );

      return clientsWithData;
    } catch (error) {
      console.error("Error fetching clients with related data:", error);
      return rejectWithValue("Failed to fetch clients data");
    }
  }
);

// Real-time listener setup
export const setupRealtimeListeners = createAsyncThunk(
  "clients/setupRealtimeListeners",
  async (_, { dispatch, getState }) => {
    const state = getState() as { clients: ClientsState };
    
    // Clean up existing listeners
    Object.values(state.clients.realtimeListeners).forEach(unsubscribe => {
      if (unsubscribe) unsubscribe();
    });

    const listeners: Partial<ClientsState["realtimeListeners"]> = {};

    try {
      // Clients listener
      const clientsQuery = query(collection(db, "clients"), orderBy("createdAt", "desc"));
      listeners.clients = onSnapshot(clientsQuery, (snapshot) => {
        const changes = snapshot.docChanges();
        changes.forEach((change) => {
          const clientData = { id: change.doc.id, ...change.doc.data() } as Client;
          
          if (change.type === "added") {
            dispatch(addClient(clientData));
          } else if (change.type === "modified") {
            dispatch(updateClient(clientData));
          } else if (change.type === "removed") {
            dispatch(removeClient(change.doc.id));
          }
        });
      });

      // Jobs listener
      const jobsQuery = query(collection(db, "jobs"), orderBy("createdAt", "desc"));
      listeners.jobs = onSnapshot(jobsQuery, (snapshot) => {
        const changes = snapshot.docChanges();
        changes.forEach((change) => {
          const jobData = { id: change.doc.id, ...change.doc.data() } as Job;
          
          if (change.type === "added") {
            dispatch(addJob(jobData));
          } else if (change.type === "modified") {
            dispatch(updateJob(jobData));
          } else if (change.type === "removed") {
            dispatch(removeJob(change.doc.id));
          }
        });
      });

      // Candidates listener
      const candidatesQuery = query(collection(db, "candidates"), orderBy("appliedDate", "desc"));
      listeners.candidates = onSnapshot(candidatesQuery, (snapshot) => {
        const changes = snapshot.docChanges();
        changes.forEach((change) => {
          const candidateData = { id: change.doc.id, ...change.doc.data() } as Candidate;
          
          if (change.type === "added") {
            dispatch(addCandidate(candidateData));
          } else if (change.type === "modified") {
            dispatch(updateCandidate(candidateData));
          } else if (change.type === "removed") {
            dispatch(removeCandidate(change.doc.id));
          }
        });
      });

      // Feedback listener
      const feedbackQuery = query(collection(db, "clientFeedback"), orderBy("feedbackDate", "desc"));
      listeners.feedback = onSnapshot(feedbackQuery, (snapshot) => {
        const changes = snapshot.docChanges();
        changes.forEach((change) => {
          const feedbackData = { id: change.doc.id, ...change.doc.data() };
          
          if (change.type === "added") {
            dispatch(addFeedback(feedbackData));
          } else if (change.type === "modified") {
            dispatch(updateFeedback(feedbackData));
          } else if (change.type === "removed") {
            dispatch(removeFeedback(change.doc.id));
          }
        });
      });

      // Communications listener
      const communicationsQuery = query(collection(db, "clientCommunications"), orderBy("date", "desc"));
      listeners.communications = onSnapshot(communicationsQuery, (snapshot) => {
        const changes = snapshot.docChanges();
        changes.forEach((change) => {
          const commData = { id: change.doc.id, ...change.doc.data() };
          
          if (change.type === "added") {
            dispatch(addCommunication(commData));
          } else if (change.type === "modified") {
            dispatch(updateCommunication(commData));
          } else if (change.type === "removed") {
            dispatch(removeCommunication(change.doc.id));
          }
        });
      });

      return listeners;
    } catch (error) {
      console.error("Error setting up real-time listeners:", error);
      throw error;
    }
  }
);

const clientsSlice = createSlice({
  name: "clients",
  initialState,
  reducers: {
    // Client actions
    addClient: (state, action: PayloadAction<Client>) => {
      const existingIndex = state.clients.findIndex(c => c.id === action.payload.id);
      if (existingIndex === -1) {
        state.clients.unshift({
          ...action.payload,
          jobs: [],
          candidates: [],
          recentFeedback: [],
          recentCommunications: [],
          totalJobs: 0,
          totalCandidates: 0,
          totalHires: 0,
          activeCandidates: 0,
        });
      }
    },
    
    updateClient: (state, action: PayloadAction<Client>) => {
      const index = state.clients.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.clients[index] = {
          ...state.clients[index],
          ...action.payload,
        };
      }
    },
    
    removeClient: (state, action: PayloadAction<string>) => {
      state.clients = state.clients.filter(c => c.id !== action.payload);
    },

    // Job actions
    addJob: (state, action: PayloadAction<Job>) => {
      const job = action.payload;
      const clientIndex = state.clients.findIndex(c => c.id === job.clientId);
      if (clientIndex !== -1) {
        const client = state.clients[clientIndex];
        const existingJobIndex = client.jobs?.findIndex(j => j.id === job.id) ?? -1;
        
        if (existingJobIndex === -1) {
          client.jobs = client.jobs || [];
          client.jobs.unshift(job);
          client.totalJobs = client.jobs.length;
        }
      }
    },
    
    updateJob: (state, action: PayloadAction<Job>) => {
      const job = action.payload;
      const clientIndex = state.clients.findIndex(c => c.id === job.clientId);
      if (clientIndex !== -1) {
        const client = state.clients[clientIndex];
        const jobIndex = client.jobs?.findIndex(j => j.id === job.id) ?? -1;
        if (jobIndex !== -1 && client.jobs) {
          client.jobs[jobIndex] = job;
        }
      }
    },
    
    removeJob: (state, action: PayloadAction<string>) => {
      state.clients.forEach(client => {
        if (client.jobs) {
          client.jobs = client.jobs.filter(j => j.id !== action.payload);
          client.totalJobs = client.jobs.length;
        }
      });
    },

    // Candidate actions
    addCandidate: (state, action: PayloadAction<Candidate>) => {
      const candidate = action.payload;
      const clientIndex = state.clients.findIndex(c => c.id === candidate.clientId);
      if (clientIndex !== -1) {
        const client = state.clients[clientIndex];
        const existingCandidateIndex = client.candidates?.findIndex(c => c.id === candidate.id) ?? -1;
        
        if (existingCandidateIndex === -1) {
          client.candidates = client.candidates || [];
          client.candidates.unshift(candidate);
          client.totalCandidates = client.candidates.length;
          client.totalHires = client.candidates.filter((c: any) => c.status === "hired").length;
          client.activeCandidates = client.candidates.filter((c: any) => 
            c.status && ["applied", "interviewing", "offer_extended"].includes(c.status)
          ).length;
        }
      }
    },
    
    updateCandidate: (state, action: PayloadAction<Candidate>) => {
      const candidate = action.payload;
      const clientIndex = state.clients.findIndex(c => c.id === candidate.clientId);
      if (clientIndex !== -1) {
        const client = state.clients[clientIndex];
        const candidateIndex = client.candidates?.findIndex(c => c.id === candidate.id) ?? -1;
        if (candidateIndex !== -1 && client.candidates) {
          client.candidates[candidateIndex] = candidate;
          client.totalHires = client.candidates.filter((c: any) => c.status === "hired").length;
          client.activeCandidates = client.candidates.filter((c: any) => 
            c.status && ["applied", "interviewing", "offer_extended"].includes(c.status)
          ).length;
        }
      }
    },
    
    removeCandidate: (state, action: PayloadAction<string>) => {
      state.clients.forEach(client => {
        if (client.candidates) {
          client.candidates = client.candidates.filter((c: any) => c.id !== action.payload);
          client.totalCandidates = client.candidates.length;
          client.totalHires = client.candidates.filter((c: any) => c.status === "hired").length;
          client.activeCandidates = client.candidates.filter((c: any) => 
            c.status && ["applied", "interviewing", "offer_extended"].includes(c.status)
          ).length;
        }
      });
    },

    // Feedback actions
    addFeedback: (state, action: PayloadAction<any>) => {
      const feedback = action.payload;
      const clientIndex = state.clients.findIndex(c => c.id === feedback.clientId);
      if (clientIndex !== -1) {
        const client = state.clients[clientIndex];
        const existingFeedbackIndex = client.recentFeedback?.findIndex(f => f.id === feedback.id) ?? -1;
        
        if (existingFeedbackIndex === -1) {
          client.recentFeedback = client.recentFeedback || [];
          client.recentFeedback.unshift(feedback);
          // Keep only last 10 feedback items for performance
          client.recentFeedback = client.recentFeedback.slice(0, 10);
        }
      }
    },
    
    updateFeedback: (state, action: PayloadAction<any>) => {
      const feedback = action.payload;
      const clientIndex = state.clients.findIndex(c => c.id === feedback.clientId);
      if (clientIndex !== -1) {
        const client = state.clients[clientIndex];
        const feedbackIndex = client.recentFeedback?.findIndex(f => f.id === feedback.id) ?? -1;
        if (feedbackIndex !== -1 && client.recentFeedback) {
          client.recentFeedback[feedbackIndex] = feedback;
        }
      }
    },
    
    removeFeedback: (state, action: PayloadAction<string>) => {
      state.clients.forEach(client => {
        if (client.recentFeedback) {
          client.recentFeedback = client.recentFeedback.filter(f => f.id !== action.payload);
        }
      });
    },

    // Communication actions
    addCommunication: (state, action: PayloadAction<any>) => {
      const communication = action.payload;
      const clientIndex = state.clients.findIndex(c => c.id === communication.clientId);
      if (clientIndex !== -1) {
        const client = state.clients[clientIndex];
        const existingCommIndex = client.recentCommunications?.findIndex(c => c.id === communication.id) ?? -1;
        
        if (existingCommIndex === -1) {
          client.recentCommunications = client.recentCommunications || [];
          client.recentCommunications.unshift(communication);
          // Keep only last 10 communications for performance
          client.recentCommunications = client.recentCommunications.slice(0, 10);
        }
      }
    },
    
    updateCommunication: (state, action: PayloadAction<any>) => {
      const communication = action.payload;
      const clientIndex = state.clients.findIndex(c => c.id === communication.clientId);
      if (clientIndex !== -1) {
        const client = state.clients[clientIndex];
        const commIndex = client.recentCommunications?.findIndex(c => c.id === communication.id) ?? -1;
        if (commIndex !== -1 && client.recentCommunications) {
          client.recentCommunications[commIndex] = communication;
        }
      }
    },
    
    removeCommunication: (state, action: PayloadAction<string>) => {
      state.clients.forEach(client => {
        if (client.recentCommunications) {
          client.recentCommunications = client.recentCommunications.filter(c => c.id !== action.payload);
        }
      });
    },

    // Utility actions
    clearError: (state) => {
      state.error = null;
    },
    
    setRealtimeListeners: (state, action: PayloadAction<Partial<ClientsState["realtimeListeners"]>>) => {
      state.realtimeListeners = { ...state.realtimeListeners, ...action.payload };
    },
    
    cleanupListeners: (state) => {
      Object.values(state.realtimeListeners).forEach(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
      state.realtimeListeners = {
        clients: null,
        jobs: null,
        candidates: null,
        feedback: null,
        communications: null,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClientsWithRelatedData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClientsWithRelatedData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.clients = action.payload as ClientWithRelatedData[];
        state.lastFetch = Date.now();
        state.error = null;
      })
      .addCase(fetchClientsWithRelatedData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(setupRealtimeListeners.fulfilled, (state, action) => {
        state.realtimeListeners = { ...state.realtimeListeners, ...action.payload };
      });
  },
});

export const {
  addClient,
  updateClient,
  removeClient,
  addJob,
  updateJob,
  removeJob,
  addCandidate,
  updateCandidate,
  removeCandidate,
  addFeedback,
  updateFeedback,
  removeFeedback,
  addCommunication,
  updateCommunication,
  removeCommunication,
  clearError,
  setRealtimeListeners,
  cleanupListeners,
} = clientsSlice.actions;

export default clientsSlice.reducer;

// Selectors
export const selectClients = (state: { clients: ClientsState }) => state.clients.clients;
export const selectClientsLoading = (state: { clients: ClientsState }) => state.clients.isLoading;
export const selectClientsError = (state: { clients: ClientsState }) => state.clients.error;
export const selectClientById = (clientId: string) => (state: { clients: ClientsState }) =>
  state.clients.clients.find(client => client.id === clientId);
export const selectClientJobs = (clientId: string) => (state: { clients: ClientsState }) =>
  state.clients.clients.find(client => client.id === clientId)?.jobs || [];
export const selectClientCandidates = (clientId: string) => (state: { clients: ClientsState }) =>
  state.clients.clients.find(client => client.id === clientId)?.candidates || [];
export const selectClientFeedback = (clientId: string) => (state: { clients: ClientsState }) =>
  state.clients.clients.find(client => client.id === clientId)?.recentFeedback || [];
export const selectClientCommunications = (clientId: string) => (state: { clients: ClientsState }) =>
  state.clients.clients.find(client => client.id === clientId)?.recentCommunications || [];
