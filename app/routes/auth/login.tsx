// app/routes/auth/login.tsx
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { Home, KeyRound, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
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
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { sendAuthLink } from "~/lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"magic-link" | "password">(
    "magic-link"
  );
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Function to handle magic link submission
  const handleMagicLinkSubmit = async (event: React.FormEvent) => {
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

  // Function to handle password login
  const handlePasswordLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email || !password) {
      setStatus("error");
      setErrorMessage("Please enter both email and password");
      return;
    }

    setStatus("submitting");

    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);

      // Redirect to dashboard on successful login
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      setStatus("error");

      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        setErrorMessage("Invalid email or password");
      } else if (error.code === "auth/too-many-requests") {
        setErrorMessage(
          "Too many failed login attempts. Please try again later or use a magic link."
        );
      } else {
        setErrorMessage("Failed to sign in. Please try again.");
      }
    } finally {
      setStatus("idle");
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
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as "magic-link" | "password");
            setStatus("idle");
            setErrorMessage("");
          }}
        >
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="magic-link" className="flex items-center gap-1">
              <Mail className="size-4" />
              <span>Magic Link</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="flex items-center gap-1">
              <KeyRound className="size-4" />
              <span>Password</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="magic-link">
            <form onSubmit={handleMagicLinkSubmit}>
              <CardContent className="grid gap-4 pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="email-magic">Email</Label>
                  <Input
                    id="email-magic"
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
              <CardFooter className="flex flex-col gap-4">
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
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send magic link
                    </>
                  )}
                </Button>
                <Link
                  to="/"
                  className="text-xs text-muted-foreground text-center flex items-center justify-center hover:text-primary"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Back to home
                </Link>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="password">
            <form onSubmit={handlePasswordLogin}>
              <CardContent className="grid gap-4 pt-4">
                <div className="grid gap-2">
                  <Label htmlFor="email-password">Email</Label>
                  <Input
                    id="email-password"
                    placeholder="name@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={status === "submitting"}
                    aria-invalid={status === "error"}
                    className={status === "error" ? "border-destructive" : ""}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={status === "submitting"}
                    aria-invalid={status === "error"}
                    className={status === "error" ? "border-destructive" : ""}
                  />
                  {status === "error" && (
                    <p className="text-sm text-destructive">{errorMessage}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button
                  className="w-full"
                  type="submit"
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Sign in with password
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Don't have a password yet?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto"
                    onClick={() => setActiveTab("magic-link")}
                  >
                    Use a magic link
                  </Button>{" "}
                  to sign in first.
                </p>
                <Link
                  to="/"
                  className="text-xs text-muted-foreground text-center flex items-center justify-center hover:text-primary"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Back to home
                </Link>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
