// app/routes/auth/confirm.tsx
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { completeSignIn } from "~/lib/auth";

// Add this loader function required by React Router
export function loader() {
  return { isAuthConfirmPage: true };
}

export default function AuthConfirmPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<
    "processing" | "success" | "error" | "invalid"
  >("processing");
  const [message, setMessage] = useState<string>(
    "Processing your sign-in link..."
  );

  // Use a ref instead of state to prevent re-renders
  const authAttemptedRef = useRef(false);

  useEffect(() => {
    // Only attempt authentication once
    if (authAttemptedRef.current) return;
    authAttemptedRef.current = true;

    const completeAuthentication = async () => {
      try {
        // Handle the authentication link
        const user = await completeSignIn();

        if (user) {
          // Successfully signed in
          setStatus("success");
          setMessage("Successfully signed in! Redirecting...");

          // Redirect to dashboard after a brief delay
          setTimeout(() => {
            navigate("/dashboard");
          }, 1500);
        } else {
          // Something went wrong
          setStatus("error");
          setMessage(
            "We couldn't complete your sign-in. The link may be invalid or expired."
          );
        }
      } catch (error) {
        console.error("Authentication error:", error);
        setStatus("error");
        setMessage("An error occurred during sign-in. Please try again.");
      }
    };

    completeAuthentication();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            {status === "processing"
              ? "Welcome back"
              : status === "success"
              ? "Sign in successful"
              : "Sign in failed"}
          </h1>
          <p className="text-sm text-muted-foreground">{message}</p>

          <div className="mt-4 flex justify-center">
            {status === "processing" && (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            )}
            {status === "success" && (
              <div className="rounded-full bg-green-500 p-2">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            )}
            {(status === "error" || status === "invalid") && (
              <div className="rounded-full bg-red-500 p-2">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            )}
          </div>

          {(status === "error" || status === "invalid") && (
            <div className="mt-4">
              <button
                className="text-primary underline hover:text-primary/90"
                onClick={() => navigate("/auth/login")}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
