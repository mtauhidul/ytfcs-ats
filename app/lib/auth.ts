// app/lib/auth.ts
import {
  getAuth,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

// Constants
const AUTH_EMAIL_KEY = "emailForSignIn";
const ACTION_CODE_SETTINGS = {
  // URL you want to redirect back to after sign-in
  url:
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/confirm`
      : "http://localhost:3000/auth/confirm",
  handleCodeInApp: true,
};

// Types
export type UserRole =
  | "Admin"
  | "Hiring Manager"
  | "Recruiter"
  | "Interviewer"
  | "Team Member";

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  photoUrl?: string;
}

// Save email locally for the authentication process
export const saveEmailForAuth = (email: string) => {
  localStorage.setItem(AUTH_EMAIL_KEY, email);
};

// Get the stored email for auth
export const getEmailForAuth = () => {
  return localStorage.getItem(AUTH_EMAIL_KEY);
};

// Clear the stored email after authentication is complete
export const clearEmailForAuth = () => {
  localStorage.removeItem(AUTH_EMAIL_KEY);
};

// Send email link for passwordless sign-in
export const sendAuthLink = async (
  email: string,
  invitedBy?: string
): Promise<boolean> => {
  try {
    const auth = getAuth();
    await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS);
    saveEmailForAuth(email);

    // If this is an invitation, record it in Firestore
    if (invitedBy) {
      const inviteRef = doc(collection(db, "invites"));
      await setDoc(inviteRef, {
        email,
        invitedBy,
        status: "pending",
        createdAt: serverTimestamp(),
      });
    }

    return true;
  } catch (error) {
    console.error("Error sending sign-in link:", error);
    return false;
  }
};

// Complete sign-in with email link
export const completeSignIn = async (): Promise<AuthUser | null> => {
  try {
    const auth = getAuth();
    const url = window.location.href;

    if (isSignInWithEmailLink(auth, url)) {
      // Get email from localStorage or prompt user
      let email = getEmailForAuth();

      if (!email) {
        // This can happen if the user opened the link on a different device
        email =
          window.prompt("Please provide your email for confirmation") || "";
      }

      if (!email) return null;

      // Complete the sign-in process
      const result = await signInWithEmailLink(auth, email, url);
      clearEmailForAuth();

      // Check if user has a team member entry
      const teamMemberQuery = query(
        collection(db, "teamMembers"),
        where("email", "==", email)
      );

      const querySnapshot = await getDocs(teamMemberQuery);

      if (!querySnapshot.empty) {
        // User exists in teamMembers collection
        const teamMemberData = querySnapshot.docs[0].data();

        // Return authenticated user with role information
        return {
          uid: result.user.uid,
          email: result.user.email || email,
          name: teamMemberData.name || "Team Member",
          role: teamMemberData.role || "Team Member",
          photoUrl:
            teamMemberData.photoUrl || result.user.photoURL || undefined,
        };
      } else {
        // User authenticated but not in teamMembers - handle this case
        // This might happen if someone gets an invite link without being added
        console.warn("User authenticated but not found in teamMembers");
        await signOut(auth);
        return null;
      }
    } else {
      console.error("Invalid sign-in link");
      return null;
    }
  } catch (error) {
    console.error("Error completing sign-in:", error);
    return null;
  }
};

// Sign out the current user
export const signOutUser = async (): Promise<boolean> => {
  try {
    const auth = getAuth();
    await signOut(auth);
    return true;
  } catch (error) {
    console.error("Error signing out:", error);
    return false;
  }
};

// Check if user has required role
export const hasRole = async (
  uid: string,
  requiredRoles: UserRole[]
): Promise<boolean> => {
  try {
    // Get user's team member record to check role
    const teamMemberQuery = query(
      collection(db, "teamMembers"),
      where("uid", "==", uid)
    );

    const querySnapshot = await getDocs(teamMemberQuery);

    if (querySnapshot.empty) return false;

    const userRole = querySnapshot.docs[0].data().role as UserRole;
    return requiredRoles.includes(userRole);
  } catch (error) {
    console.error("Error checking user role:", error);
    return false;
  }
};

// Get current authenticated user with additional data from Firestore
export const getCurrentUser = (): Promise<AuthUser | null> => {
  return new Promise((resolve) => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();

      if (!user) {
        resolve(null);
        return;
      }

      try {
        // Get user data from teamMembers collection
        const teamMemberQuery = query(
          collection(db, "teamMembers"),
          where("email", "==", user.email)
        );

        const querySnapshot = await getDocs(teamMemberQuery);

        if (querySnapshot.empty) {
          resolve(null);
          return;
        }

        const teamMemberData = querySnapshot.docs[0].data();

        // Update the teamMember with the Firebase uid if not present
        if (!teamMemberData.uid) {
          const teamMemberRef = querySnapshot.docs[0].ref;
          await setDoc(teamMemberRef, { uid: user.uid }, { merge: true });
        }

        resolve({
          uid: user.uid,
          email: user.email || "",
          name: teamMemberData.name || "Team Member",
          role: teamMemberData.role || "Team Member",
          photoUrl: teamMemberData.photoUrl || user.photoURL || undefined,
        });
      } catch (error) {
        console.error("Error getting user data:", error);
        resolve(null);
      }
    });
  });
};

// Send invitation email to a new team member
export const sendInvitation = async (
  email: string,
  name: string,
  role: UserRole,
  invitedBy: string
): Promise<boolean> => {
  try {
    // Add team member to the database
    const teamMemberRef = doc(collection(db, "teamMembers"));
    await setDoc(teamMemberRef, {
      email,
      name,
      role,
      createdAt: serverTimestamp(),
      invitedBy,
    });

    // Send the authentication email
    return await sendAuthLink(email, invitedBy);
  } catch (error) {
    console.error("Error sending invitation:", error);
    return false;
  }
};
