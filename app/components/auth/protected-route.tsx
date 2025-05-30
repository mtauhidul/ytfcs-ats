import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
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
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      // Move navigation into an effect to avoid render loops
      navigate("/auth/login", {
        state: { from: location.pathname },
        replace: true,
      });
    }
  }, [user, loading, location.pathname, navigate]);

  // Show loading indicator while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading...</span>
      </div>
    );
  }

  // Hidden loading state for when we're about to redirect
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Redirecting...</span>
      </div>
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
