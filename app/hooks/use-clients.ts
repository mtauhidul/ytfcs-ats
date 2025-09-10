// app/hooks/use-clients.ts
import { useAppDispatch, useAppSelector } from "./redux";
import { 
  fetchClientsWithRelatedData, 
  setupRealtimeListeners,
  cleanupListeners,
  selectClients,
  selectClientsLoading,
  selectClientsError,
  selectClientById,
  selectClientJobs,
  selectClientCandidates,
  selectClientFeedback,
  selectClientCommunications,
} from "~/features/clientsSlice";
import { useEffect } from "react";

/**
 * Hook for managing clients data with real-time sync
 * This hook provides all client-related data and handles real-time synchronization
 */
export function useClients() {
  const dispatch = useAppDispatch();
  const clients = useAppSelector(selectClients);
  const loading = useAppSelector(selectClientsLoading);
  const error = useAppSelector(selectClientsError);

  // Initialize and cleanup real-time sync
  useEffect(() => {
    // Fetch initial data
    dispatch(fetchClientsWithRelatedData());
    
    // Setup real-time listeners
    dispatch(setupRealtimeListeners());
    
    // Cleanup on unmount
    return () => {
      dispatch(cleanupListeners());
    };
  }, [dispatch]);

  return {
    clients,
    loading,
    error,
    // Helper function to get client by ID
    getClientById: (clientId: string) => clients.find(c => c.id === clientId),
    // Helper function to refresh data manually if needed
    refresh: () => dispatch(fetchClientsWithRelatedData()),
  };
}

/**
 * Hook for getting real-time data for a specific client
 */
export function useClientData(clientId: string | null) {
  const client = useAppSelector(state => clientId ? selectClientById(clientId)(state) : null);
  const jobs = useAppSelector(state => clientId ? selectClientJobs(clientId)(state) : []);
  const candidates = useAppSelector(state => clientId ? selectClientCandidates(clientId)(state) : []);
  const feedback = useAppSelector(state => clientId ? selectClientFeedback(clientId)(state) : []);
  const communications = useAppSelector(state => clientId ? selectClientCommunications(clientId)(state) : []);

  return {
    client,
    jobs,
    candidates,
    feedback,
    communications,
    // Computed statistics
    totalJobs: jobs.length,
    totalCandidates: candidates.length,
    totalHires: candidates.filter((c: any) => c.status === "hired").length,
    activeCandidates: candidates.filter((c: any) => 
      c.status && ["applied", "interviewing", "offer_extended"].includes(c.status)
    ).length,
  };
}
