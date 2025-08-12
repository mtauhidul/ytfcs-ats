import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, type AuthUser } from "~/lib/auth";
import { db } from "~/lib/firebase";

// Define the context type
interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
  refreshUser: () => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  setUser: () => {},
  refreshUser: async () => {},
});

// Custom hook to use auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// AuthProvider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to refresh user data
  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error("Error refreshing user:", err);
      setError("Failed to refresh user data");
    }
  };

  // Helper function to check if user has password auth method
  const checkUserHasPassword = (firebaseUser: any): boolean => {
    return firebaseUser.providerData.some(
      (provider: any) => provider.providerId === "password"
    );
  };

  // Initial auth state listener
  useEffect(() => {
    const auth = getAuth();
    let isMounted = true;
    const MIN_LOADING_TIME = 1000; // Minimum 1 second loading to prevent flashing

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      const startTime = Date.now();
      setLoading(true);
      setError(null); // Clear any previous errors

      try {
        if (firebaseUser) {
          // User is signed in, get additional data from Firestore
          const teamMemberQuery = query(
            collection(db, "teamMembers"),
            where("email", "==", firebaseUser.email)
          );

          const querySnapshot = await getDocs(teamMemberQuery);

          if (!isMounted) return;

          if (!querySnapshot.empty) {
            const teamMemberData = querySnapshot.docs[0].data();

            // Check if user has password provider
            const hasPassword = checkUserHasPassword(firebaseUser);

            // Create combined user object
            const authUser: AuthUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              name: teamMemberData.name || "Team Member",
              role: teamMemberData.role || "Team Member",
              photoUrl:
                teamMemberData.photoUrl || firebaseUser.photoURL || undefined,
              hasPassword, // Include the hasPassword property
            };

            // Ensure minimum loading time before setting user
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

            setTimeout(() => {
              if (isMounted) {
                setUser(authUser);
                setLoading(false);
              }
            }, remainingTime);
            return;
          } else {
            // User exists in Firebase but not in teamMembers collection
            // Wait minimum time before showing error
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

            setTimeout(() => {
              if (isMounted) {
                console.warn("User authenticated but not found in teamMembers collection");
                setError("User not found in team members. Please contact your administrator.");
                setUser(null);
                setLoading(false);
              }
            }, remainingTime);
            return;
          }
        } else {
          // User is signed out
          setUser(null);
        }
      } catch (err) {
        console.error("Error in auth state changed:", err);
        
        // Ensure minimum loading time before showing error
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

        setTimeout(() => {
          if (isMounted) {
            setError("Authentication error. Please try again.");
            setUser(null);
            setLoading(false);
          }
        }, remainingTime);
        return;
      }

      // For sign out case, respect minimum loading time
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);

      setTimeout(() => {
        if (isMounted) {
          setLoading(false);
        }
      }, remainingTime);
    });

    // Cleanup subscription
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Context value
  const value: AuthContextType = {
    user,
    loading,
    error,
    setUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
