// app/dashboard/automation/email-automation.tsx

import { Mail, Pause, Play, Plus, RefreshCw } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";

interface EmailAccount {
  id: string;
  provider: string;
  username: string;
  server?: string;
  port?: number;
  automationEnabled: boolean;
  isActive: boolean;
  lastChecked?: string;
  totalProcessed: number;
  totalImported: number;
  lastError?: string;
  createdAt: string;
}

interface AutomationStatus {
  isRunning: boolean;
  checkInterval: number;
  activeProcesses: Array<{
    accountId: string;
    status: string;
    totalEmails?: number;
    processedEmails?: number;
  }>;
  stats: {
    totalAccounts: number;
    activeAccounts: number;
    totalProcessed: number;
    totalImported: number;
    recentImports: number;
    recentErrors: number;
  };
}

const EmailAutomation: React.FC = () => {
  const [automationStatus, setAutomationStatus] =
    useState<AutomationStatus | null>(null);
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [recentImports, setRecentImports] = useState<number>(0);
  const [recentImportsLoading, setRecentImportsLoading] = useState(false);

  // Cache and timing management
  const lastRecentImportsFetch = useRef<number>(0);
  const recentImportsCache = useRef<{
    count: number;
    timestamp: number;
  } | null>(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  const recentImportsInterval = useRef<NodeJS.Timeout | null>(null);

  // Settings
  const [checkInterval, setCheckInterval] = useState(15);
  const [maxEmailsPerCheck, setMaxEmailsPerCheck] = useState(20);

  // Fetch recent imports from Firebase
  const fetchRecentImports = async (useCache: boolean = true) => {
    const now = Date.now();

    // Check cache first if useCache is true
    if (useCache && recentImportsCache.current) {
      const cacheAge = now - recentImportsCache.current.timestamp;
      if (cacheAge < CACHE_DURATION) {
        setRecentImports(recentImportsCache.current.count);
        return recentImportsCache.current.count;
      }
    }

    // Avoid multiple simultaneous requests
    if (now - lastRecentImportsFetch.current < 1000) {
      return recentImports;
    }

    setRecentImportsLoading(true);
    lastRecentImportsFetch.current = now;

    try {
      // Calculate 24 hours ago timestamp
      const twentyFourHoursAgo = new Date(
        now - 24 * 60 * 60 * 1000
      ).toISOString();

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/candidates/recent-imports?since=${twentyFourHoursAgo}`,
        {
          headers: { "x-api-key": import.meta.env.VITE_API_KEY },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const count = data.data?.count || 0;

        // Update cache
        recentImportsCache.current = {
          count,
          timestamp: now,
        };

        setRecentImports(count);
        return count;
      } else {
        throw new Error("Failed to fetch recent imports");
      }
    } catch (error) {
      console.error("Error fetching recent imports:", error);
      // Don't show error toast for background updates unless it's the initial load
      if (!useCache) {
        toast.error("Failed to load recent imports");
      }
      return recentImports;
    } finally {
      setRecentImportsLoading(false);
    }
  };

  // Fetch automation status and accounts
  const fetchData = async () => {
    try {
      const [statusResponse, accountsResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/email/automation/status`, {
          headers: { "x-api-key": import.meta.env.VITE_API_KEY },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/email/automation/accounts`, {
          headers: { "x-api-key": import.meta.env.VITE_API_KEY },
        }),
      ]);

      if (statusResponse.ok && accountsResponse.ok) {
        const statusData = await statusResponse.json();
        const accountsData = await accountsResponse.json();

        setAutomationStatus(statusData.data);
        setEmailAccounts(accountsData.data);

        if (statusData.data.checkInterval) {
          setCheckInterval(statusData.data.checkInterval);
        }
      }
    } catch (error) {
      console.error("Error fetching automation data:", error);
      toast.error("Failed to load automation data");
    } finally {
      setLoading(false);
    }
  };

  // Start automation
  const startAutomation = async () => {
    setActionLoading("start");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/email/automation/start`,
        {
          method: "POST",
          headers: { "x-api-key": import.meta.env.VITE_API_KEY },
        }
      );

      if (response.ok) {
        toast.success("Email automation started");
        fetchData();
      } else {
        throw new Error("Failed to start automation");
      }
    } catch (error) {
      toast.error("Failed to start automation");
    } finally {
      setActionLoading(null);
    }
  };

  // Stop automation
  const stopAutomation = async () => {
    setActionLoading("stop");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/email/automation/stop`,
        {
          method: "POST",
          headers: { "x-api-key": import.meta.env.VITE_API_KEY },
        }
      );

      if (response.ok) {
        toast.success("Email automation stopped");
        fetchData();
      } else {
        throw new Error("Failed to stop automation");
      }
    } catch (error) {
      toast.error("Failed to stop automation");
    } finally {
      setActionLoading(null);
    }
  };

  // Update settings
  const updateSettings = async () => {
    setActionLoading("settings");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/email/automation/settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": import.meta.env.VITE_API_KEY,
          },
          body: JSON.stringify({
            checkIntervalMinutes: checkInterval,
            maxEmailsPerCheck,
          }),
        }
      );

      if (response.ok) {
        toast.success("Settings updated");
        fetchData();
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle account automation
  const toggleAccountAutomation = async (
    accountId: string,
    enabled: boolean
  ) => {
    const toggleLoadingKey = `toggle-${accountId}`;

    try {
      // Set loading state
      setActionLoading(toggleLoadingKey);

      // Show loading toast
      toast.loading(
        `${enabled ? "Enabling" : "Disabling"} automation for account...`,
        {
          id: toggleLoadingKey,
        }
      );

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/email/automation/accounts/${accountId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": import.meta.env.VITE_API_KEY,
          },
          body: JSON.stringify({ automationEnabled: enabled }),
        }
      );

      if (response.ok) {
        // Clear the loading toast
        toast.dismiss(toggleLoadingKey);

        // Show success toast
        toast.success(
          `Automation ${enabled ? "enabled" : "disabled"} for account`
        );

        // Refresh data
        await fetchData();
      } else {
        throw new Error("Failed to update account");
      }
    } catch (error) {
      // Clear loading toast and show error
      toast.dismiss(toggleLoadingKey);
      toast.error("Failed to update account automation");
      console.error("Error updating account automation:", error);
    } finally {
      // Clear loading state
      setActionLoading(null);
    }
  };

  // Force check account
  const forceCheckAccount = async (accountId: string) => {
    setActionLoading(`check-${accountId}`);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/email/automation/accounts/${accountId}/check`,
        {
          method: "POST",
          headers: { "x-api-key": import.meta.env.VITE_API_KEY },
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(
          `Check completed: ${result.data.imported} candidates imported`
        );

        // Refresh both automation data and recent imports
        await Promise.all([
          fetchData(),
          fetchRecentImports(false), // Force refresh without cache
        ]);
      } else {
        throw new Error("Failed to check account");
      }
    } catch (error) {
      toast.error("Failed to check account");
    } finally {
      setActionLoading(null);
    }
  };

  // Setup intervals and initial data loading
  useEffect(() => {
    // Initial data load
    const loadInitialData = async () => {
      await Promise.all([
        fetchData(),
        fetchRecentImports(true), // Use cache on initial load
      ]);
    };

    loadInitialData();

    // Set up polling for automation status (every 30 seconds)
    const automationInterval = setInterval(fetchData, 30000);

    // Set up polling for recent imports (every 2 minutes)
    recentImportsInterval.current = setInterval(() => {
      fetchRecentImports(true); // Use cache for background updates
    }, 2 * 60 * 1000);

    return () => {
      clearInterval(automationInterval);
      if (recentImportsInterval.current) {
        clearInterval(recentImportsInterval.current);
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recentImportsInterval.current) {
        clearInterval(recentImportsInterval.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Automation</h1>
          <p className="text-muted-foreground">
            Automatically monitor email accounts for new candidate resumes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              fetchData();
              fetchRecentImports(false); // Force refresh without cache
            }}
            disabled={actionLoading === "refresh" || recentImportsLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                actionLoading === "refresh" || recentImportsLoading
                  ? "animate-spin"
                  : ""
              }`}
            />
            Refresh
          </Button>

          {automationStatus?.isRunning ? (
            <Button
              variant="destructive"
              onClick={stopAutomation}
              disabled={actionLoading === "stop"}
            >
              <Pause className="h-4 w-4 mr-2" />
              Stop
            </Button>
          ) : (
            <Button
              onClick={startAutomation}
              disabled={actionLoading === "start"}
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  automationStatus?.isRunning ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="font-medium">
                {automationStatus?.isRunning ? "Running" : "Stopped"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Monitoring Status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {automationStatus?.stats.activeAccounts || 0}
            </div>
            <p className="text-sm text-muted-foreground">Active Accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold flex items-center gap-2">
              {recentImportsLoading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                recentImports
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Recent Imports (24h)
            </p>
          </CardContent>
        </Card>

        {/* <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {automationStatus?.stats.totalImported || 0}
            </div>
            <p className="text-sm text-muted-foreground">Total Imported</p>
          </CardContent>
        </Card> */}
      </div>

      {/* Settings */}
      {/* <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automation Settings
          </CardTitle>
          <CardDescription>
            Configure how often to check for new emails and processing limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="check-interval">Check Interval (minutes)</Label>
              <Input
                id="check-interval"
                type="number"
                min="5"
                max="1440"
                value={checkInterval}
                onChange={(e) => setCheckInterval(parseInt(e.target.value))}
              />
            </div>

            <div>
              <Label htmlFor="max-emails">Max Emails per Check</Label>
              <Input
                id="max-emails"
                type="number"
                min="1"
                max="100"
                value={maxEmailsPerCheck}
                onChange={(e) => setMaxEmailsPerCheck(parseInt(e.target.value))}
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={updateSettings}
                disabled={actionLoading === "settings"}
              >
                {actionLoading === "settings"
                  ? "Updating..."
                  : "Update Settings"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card> */}

      {/* Email Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Accounts
          </CardTitle>
          <CardDescription>
            Manage email accounts for automated candidate monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {emailAccounts.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No Email Accounts</h3>
                <p className="text-muted-foreground mb-4">
                  Add email accounts to start automated candidate monitoring
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Email Account
                </Button>
              </div>
            ) : (
              emailAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{account.username}</h4>
                      <Badge variant="outline">{account.provider}</Badge>
                      {account.automationEnabled && (
                        <Badge variant="default">Automated</Badge>
                      )}
                      {account.lastError && (
                        <Badge variant="destructive">Error</Badge>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Last checked:{" "}
                      {account.lastChecked
                        ? new Date(account.lastChecked).toLocaleString()
                        : "Never"}
                    </div>

                    {/* <div className="text-sm text-muted-foreground">
                      Processed: {account.totalProcessed} | Imported:{" "}
                      {account.totalImported}
                    </div> */}

                    {account.lastError && (
                      <div className="text-sm text-red-600 mt-1">
                        {account.lastError}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={account.automationEnabled}
                      disabled={actionLoading === `toggle-${account.id}`}
                      onCheckedChange={(checked: boolean) =>
                        toggleAccountAutomation(account.id, checked)
                      }
                    />

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => forceCheckAccount(account.id)}
                      disabled={actionLoading === `check-${account.id}`}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${
                          actionLoading === `check-${account.id}`
                            ? "animate-spin"
                            : ""
                        }`}
                      />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Processes */}
      {automationStatus?.activeProcesses &&
        automationStatus.activeProcesses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Processes</CardTitle>
              <CardDescription>
                Currently processing email accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {automationStatus.activeProcesses.map((process, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <div>
                      <span className="font-medium">
                        Account {process.accountId}
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {process.status}
                      </span>
                    </div>

                    {process.totalEmails &&
                      process.processedEmails !== undefined && (
                        <div className="text-sm">
                          {process.processedEmails} / {process.totalEmails}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
};

export default EmailAutomation;
