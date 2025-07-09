// app/dashboard/automation/email-automation.tsx

import {
  Activity,
  AlertTriangle,
  Clock,
  Database,
  Mail,
  MoreVertical,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Shield,
  XCircle,
  Zap,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Switch } from "~/components/ui/switch";
import EmailConnection from "./email-connection";

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
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);

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

  // Status indicator component
  const StatusIndicator = ({
    status,
    className = "",
  }: {
    status: "running" | "stopped" | "error";
    className?: string;
  }) => {
    const statusConfig = {
      running: {
        color: "bg-emerald-500",
        shadow: "shadow-emerald-500/50",
        label: "Running",
      },
      stopped: {
        color: "bg-red-500",
        shadow: "shadow-red-500/50",
        label: "Stopped",
      },
      error: {
        color: "bg-amber-500",
        shadow: "shadow-amber-500/50",
        label: "Error",
      },
    };

    const config = statusConfig[status];

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="relative">
          <div
            className={`h-2.5 w-2.5 rounded-full ${config.color} ${config.shadow} animate-pulse`}
          />
          <div
            className={`absolute inset-0 h-2.5 w-2.5 rounded-full ${config.color} opacity-75 animate-ping`}
          />
        </div>
        <span className="text-sm font-medium text-foreground">
          {config.label}
        </span>
      </div>
    );
  };

  // Provider badge component
  const ProviderBadge = ({ provider }: { provider: string }) => {
    const providerConfig: Record<string, { icon: string; color: string }> = {
      gmail: { icon: "📧", color: "bg-blue-50 text-blue-700 border-blue-200" },
      outlook: {
        icon: "📮",
        color: "bg-orange-50 text-orange-700 border-orange-200",
      },
      imap: { icon: "⚙️", color: "bg-gray-50 text-gray-700 border-gray-200" },
      pop3: {
        icon: "📬",
        color: "bg-purple-50 text-purple-700 border-purple-200",
      },
    };

    const config = providerConfig[provider.toLowerCase()] || {
      icon: "📧",
      color: "bg-gray-50 text-gray-700 border-gray-200",
    };

    return (
      <Badge
        variant="outline"
        className={`text-[9px] sm:text-[10px] font-medium px-1.5 sm:px-2 py-0.5 rounded-full ${config.color} flex-shrink-0`}
      >
        <span className="mr-0.5 sm:mr-1">{config.icon}</span>
        <span className="truncate">{provider.toUpperCase()}</span>
      </Badge>
    );
  };

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
        toast.success("🚀 Email automation started successfully");
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
        toast.success("⏸️ Email automation stopped");
        fetchData();
        setShowStopDialog(false);
      } else {
        throw new Error("Failed to stop automation");
      }
    } catch (error) {
      toast.error("Failed to stop automation");
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
          `✅ Automation ${enabled ? "enabled" : "disabled"} for account`
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
          `✨ Check completed: ${result.data.imported} candidates imported`
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
      <div className="flex items-center justify-center min-h-[400px] bg-zinc-50/50">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
            <div className="absolute inset-0 h-8 w-8 border-2 border-blue-200 rounded-full animate-pulse" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Loading automation dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/30">
      <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg flex-shrink-0">
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">
                    Email Automation
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                    Intelligent monitoring system for automated candidate
                    processing
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchData();
                  fetchRecentImports(false);
                }}
                disabled={actionLoading === "refresh" || recentImportsLoading}
                className="flex-1 sm:flex-none h-9 px-3 border-gray-200 hover:border-gray-300 transition-colors"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${
                    actionLoading === "refresh" || recentImportsLoading
                      ? "animate-spin"
                      : ""
                  }`}
                />
                <span className="text-sm">Refresh</span>
              </Button>

              {automationStatus?.isRunning ? (
                <AlertDialog
                  open={showStopDialog}
                  onOpenChange={setShowStopDialog}
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 sm:flex-none h-9 px-3 bg-red-500 hover:bg-red-600 transition-colors"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      <span className="text-sm">Stop</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-md mx-4 sm:mx-auto">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-base">
                        <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        <span>Stop Email Automation</span>
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-sm leading-relaxed">
                        This will stop all active email monitoring processes.
                        You can restart automation at any time, but ongoing
                        imports may be interrupted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={stopAutomation}
                        disabled={actionLoading === "stop"}
                        className="w-full sm:w-auto bg-red-500 hover:bg-red-600"
                      >
                        {actionLoading === "stop" ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Stopping...
                          </>
                        ) : (
                          "Stop Automation"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  size="sm"
                  onClick={startAutomation}
                  disabled={actionLoading === "start"}
                  className="flex-1 sm:flex-none h-9 px-3 bg-emerald-500 hover:bg-emerald-600 transition-colors"
                >
                  <Play className="h-4 w-4 mr-2" />
                  <span className="text-sm">Start</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Status Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Monitoring Status */}
          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                  <StatusIndicator
                    status={automationStatus?.isRunning ? "running" : "stopped"}
                  />
                  <p className="text-[10px] sm:text-xs font-mono text-muted-foreground uppercase tracking-wide">
                    System Status
                  </p>
                </div>
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          {/* Active Accounts */}
          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                  <div className="flex items-baseline gap-1 sm:gap-2">
                    <span className="text-xl sm:text-2xl font-bold text-gray-900">
                      {automationStatus?.stats.activeAccounts || 0}
                    </span>
                    <span className="text-[10px] sm:text-xs text-emerald-600 font-medium">
                      / {automationStatus?.stats.totalAccounts || 0}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs font-mono text-muted-foreground uppercase tracking-wide">
                    Active Accounts
                  </p>
                </div>
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Imports */}
          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white sm:col-span-2 lg:col-span-1">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {recentImportsLoading ? (
                      <RefreshCw className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-blue-500" />
                    ) : (
                      <span className="text-xl sm:text-2xl font-bold text-gray-900">
                        {recentImports}
                      </span>
                    )}
                    {recentImports > 0 && (
                      <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs font-mono text-muted-foreground uppercase tracking-wide">
                    Recent Imports (24h)
                  </p>
                </div>
                <Database className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Accounts Section */}
        <Card className="border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base sm:text-lg font-semibold break-words">
                    Connected Accounts
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm break-words">
                    Manage email accounts for automated candidate monitoring
                  </CardDescription>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddAccountDialog(true)}
                className="flex items-center gap-2 h-9 px-3 border-gray-200 hover:border-gray-300 flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pt-0 px-3 sm:px-6">
            {emailAccounts.length === 0 ? (
              <div className="text-center py-8 sm:py-12 px-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                </div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  No Email Accounts Connected
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 max-w-sm mx-auto">
                  Connect your first email account to start automated candidate
                  monitoring and resume processing.
                </p>
                <Button 
                  onClick={() => setShowAddAccountDialog(true)}
                  className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Connect Email Account
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {emailAccounts.map((account) => (
                  <Card
                    key={account.id}
                    className="border border-gray-200 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md bg-gray-50/30"
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="space-y-3">
                        {/* Account Info */}
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Mail className="h-4 w-4 text-blue-600" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm sm:text-base text-gray-900 truncate">
                              {account.username}
                            </h4>
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                              <ProviderBadge provider={account.provider} />
                              {account.automationEnabled && (
                                <Badge
                                  variant="default"
                                  className="text-[9px] sm:text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200 rounded-full px-1.5 sm:px-2 py-0.5 flex-shrink-0"
                                >
                                  <Zap className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-0.5 sm:mr-1" />
                                  <span className="truncate">AUTO</span>
                                </Badge>
                              )}
                              {account.lastError && (
                                <Badge
                                  variant="destructive"
                                  className="text-[9px] sm:text-[10px] bg-red-100 text-red-700 border-red-200 rounded-full px-1.5 sm:px-2 py-0.5 flex-shrink-0"
                                >
                                  <AlertTriangle className="h-2 w-2 sm:h-2.5 sm:w-2.5 mr-0.5 sm:mr-1" />
                                  <span className="truncate">ERROR</span>
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Desktop Controls */}
                          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                            <Switch
                              checked={account.automationEnabled}
                              disabled={
                                actionLoading === `toggle-${account.id}`
                              }
                              onCheckedChange={(checked: boolean) =>
                                toggleAccountAutomation(account.id, checked)
                              }
                              className="data-[state=checked]:bg-emerald-500"
                            />

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => forceCheckAccount(account.id)}
                              disabled={actionLoading === `check-${account.id}`}
                              className="h-8 w-8 p-0 border-gray-200 hover:border-gray-300"
                            >
                              <RefreshCw
                                className={`h-3.5 w-3.5 ${
                                  actionLoading === `check-${account.id}`
                                    ? "animate-spin"
                                    : ""
                                }`}
                              />
                            </Button>
                          </div>

                          {/* Mobile Dropdown */}
                          <div className="sm:hidden flex-shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() =>
                                    toggleAccountAutomation(
                                      account.id,
                                      !account.automationEnabled
                                    )
                                  }
                                  disabled={
                                    actionLoading === `toggle-${account.id}`
                                  }
                                >
                                  {account.automationEnabled ? (
                                    <>
                                      <Pause className="h-4 w-4 mr-2" />
                                      Disable Automation
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-4 w-4 mr-2" />
                                      Enable Automation
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => forceCheckAccount(account.id)}
                                  disabled={
                                    actionLoading === `check-${account.id}`
                                  }
                                >
                                  <RefreshCw
                                    className={`h-4 w-4 mr-2 ${
                                      actionLoading === `check-${account.id}`
                                        ? "animate-spin"
                                        : ""
                                    }`}
                                  />
                                  Force Check
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Status Info */}
                        <div className="space-y-1 text-[10px] sm:text-xs font-mono text-muted-foreground ml-11">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                            <span className="truncate">
                              Last checked:{" "}
                              {account.lastChecked
                                ? new Date(account.lastChecked).toLocaleString()
                                : "Never"}
                            </span>
                          </div>

                          {account.lastError && (
                            <div className="flex items-start gap-1 sm:gap-2 text-red-600">
                              <XCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0 mt-0.5" />
                              <span className="break-words text-[9px] sm:text-[10px]">
                                {account.lastError}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Progress Indicator Bar */}
                        <div className="ml-11">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                              style={{
                                width: account.lastChecked ? "100%" : "0%",
                                opacity: account.lastChecked ? 0.7 : 0.3,
                              }}
                            />
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                            {account.totalImported} candidates imported
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Processes Section */}
        {automationStatus?.activeProcesses &&
          automationStatus.activeProcesses.length > 0 && (
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg font-semibold break-words">
                      Active Processes
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm break-words">
                      Real-time monitoring of email processing tasks
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0 px-3 sm:px-6">
                <div className="space-y-3">
                  {automationStatus.activeProcesses.map((process, index) => (
                    <div
                      key={index}
                      className="p-3 sm:p-4 border border-amber-200 rounded-lg bg-amber-50/30"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse flex-shrink-0" />
                            <span className="font-medium text-sm sm:text-base text-gray-900 truncate">
                              Account {process.accountId}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[9px] sm:text-[10px] bg-amber-100 text-amber-700 border-amber-200 rounded-full px-1.5 sm:px-2 py-0.5 flex-shrink-0"
                          >
                            <span className="truncate">{process.status}</span>
                          </Badge>
                        </div>

                        {process.totalEmails &&
                          process.processedEmails !== undefined && (
                            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                              <div className="text-xs sm:text-sm font-mono text-muted-foreground">
                                {process.processedEmails} /{" "}
                                {process.totalEmails}
                              </div>
                              <div className="w-16 sm:w-20 bg-amber-200 rounded-full h-2">
                                <div
                                  className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${
                                      (process.processedEmails /
                                        process.totalEmails) *
                                      100
                                    }%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* External Add Account Dialog */}
        <EmailConnection
          isOpen={showAddAccountDialog}
          onOpenChange={setShowAddAccountDialog}
          onConnectionSuccess={() => {
            fetchData();
            setShowAddAccountDialog(false);
          }}
          trigger={null}
        />
      </div>
    </div>
  );
};

export default EmailAutomation;
