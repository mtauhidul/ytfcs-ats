import { Loader2 } from "lucide-react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "~/context/auth-context";
import type { UserRole } from "~/lib/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({
  children,
  allowedRoles = [],
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading indicator while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!user) {
    // We need to use Navigate rather than directly changing location
    return (
      <Navigate to="/auth/login" state={{ from: location.pathname }} replace />
    );
  }

  // If allowedRoles is specified, check if user has the required role
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="mb-6 text-muted-foreground">
          You don't have permission to access this page.
        </p>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none"
        >
          Go Back
        </button>
      </div>
    );
  }

  // User is authenticated and has the required role, render children
  return <>{children}</>;
}
