import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
  type DocumentData,
  type Query,
} from "firebase/firestore";
import { db } from "~/lib/firebase";

export type SubscriptionKey = string;
type UnsubscribeFunction = Unsubscribe;

const activeSubscriptions = new Map<SubscriptionKey, UnsubscribeFunction>();

export const subscribeToCollection = <T = DocumentData>(
  collectionName: string,
  onDataChange: (data: T[]) => void,
  queryConstraints?: Parameters<typeof query>[1][]
): SubscriptionKey => {
  const subscriptionKey = `${collectionName}_${Date.now()}`;
  
  let firestoreQuery: Query<DocumentData>;
  if (queryConstraints && queryConstraints.length > 0) {
    firestoreQuery = query(collection(db, collectionName), ...queryConstraints);
  } else {
    firestoreQuery = query(collection(db, collectionName), orderBy("createdAt", "desc"));
  }

  const unsubscribe = onSnapshot(
    firestoreQuery,
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
      
      onDataChange(data);
    },
    (error) => {
      console.error(`Error in ${collectionName} subscription:`, error);
    }
  );

  activeSubscriptions.set(subscriptionKey, unsubscribe);
  return subscriptionKey;
};

export const unsubscribeFromCollection = (subscriptionKey: SubscriptionKey): void => {
  const unsubscribe = activeSubscriptions.get(subscriptionKey);
  if (unsubscribe) {
    unsubscribe();
    activeSubscriptions.delete(subscriptionKey);
  }
};

export const cleanupAllSubscriptions = (): void => {
  activeSubscriptions.forEach((unsubscribe) => unsubscribe());
  activeSubscriptions.clear();
};

export const getActiveSubscriptionsCount = (): number => {
  return activeSubscriptions.size;
};

export const subscribeToCandidates = (onUpdate: (candidates: any[]) => void) =>
  subscribeToCollection("candidates", onUpdate, [orderBy("createdAt", "desc")]);

export const subscribeToJobs = (onUpdate: (jobs: any[]) => void) =>
  subscribeToCollection("jobs", onUpdate, [orderBy("createdAt", "desc")]);

export const subscribeToStages = (onUpdate: (stages: any[]) => void) =>
  subscribeToCollection("stages", onUpdate, [orderBy("order", "asc")]);

export const subscribeToTags = (onUpdate: (tags: any[]) => void) =>
  subscribeToCollection("tags", onUpdate, [orderBy("name", "asc")]);

export const subscribeToCategories = (onUpdate: (categories: any[]) => void) =>
  subscribeToCollection("categories", onUpdate, [orderBy("name", "asc")]);

export const subscribeToApplications = (onUpdate: (applications: any[]) => void) =>
  subscribeToCollection("applications", onUpdate, [orderBy("createdAt", "desc")]);

export const subscribeToCommunications = (onUpdate: (communications: any[]) => void) =>
  subscribeToCollection("communications", onUpdate, [orderBy("createdAt", "desc")]);

export const subscribeToInterviews = (onUpdate: (interviews: any[]) => void) =>
  subscribeToCollection("interviews", onUpdate, [orderBy("scheduledAt", "desc")]);

export const subscribeToTeamMembers = (onUpdate: (teamMembers: any[]) => void) =>
  subscribeToCollection("teamMembers", onUpdate, [orderBy("createdAt", "desc")]);
