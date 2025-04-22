import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { sendAuthLink } from "~/lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Function to handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email) {
      setStatus("error");
      setErrorMessage("Please enter your email address");
      return;
    }

    setStatus("submitting");

    try {
      const success = await sendAuthLink(email);

      if (success) {
        setStatus("success");
      } else {
        throw new Error("Failed to send magic link");
      }
    } catch (error) {
      console.error("Login error:", error);
      setStatus("error");
      setErrorMessage("We couldn't send the sign-in link. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="container grid flex-1 items-center max-w-md mx-auto mt-20">
        <Card>
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We've sent a sign-in link to{" "}
              <span className="font-medium">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-4">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm text-center text-muted-foreground mb-6">
              Click the link in the email to sign in to your account. The link
              will expire in 15 minutes.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setStatus("idle");
                setEmail("");
              }}
            >
              Use a different email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container grid flex-1 items-center max-w-md mx-auto mt-20">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Enter your email to sign in to your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Input
                id="email"
                placeholder="name@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={status === "submitting"}
                aria-invalid={status === "error"}
                className={status === "error" ? "border-destructive" : ""}
              />
              {status === "error" && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              type="submit"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                "Send magic link"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
