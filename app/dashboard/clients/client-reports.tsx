// app/dashboard/clients/client-reports.tsx
"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { format, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { 
  TrendingUp, 
  Users, 
  Briefcase, 
  Clock, 
  CheckCircle,
  XCircle,
  BarChart3,
  Download,
} from "lucide-react";
import { clientService } from "~/services/clientService";
import { interviewService } from "~/services/interviewService";
import type { Client, ClientFeedback } from "~/types/client";
import type { Job, Candidate, Interview } from "~/types";

interface ClientReportData {
  client: Client;
  jobs: Job[];
  candidates: Candidate[];
  interviews: Interview[];
  feedback: ClientFeedback[];
  hireRate: number;
  avgTimeToHire: number;
  candidatesByStage: { stage: string; count: number }[];
  interviewsByOutcome: { outcome: string; count: number }[];
  monthlyActivity: { month: string; candidates: number; interviews: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function ClientReports() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [reportData, setReportData] = useState<ClientReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<"30" | "90" | "180" | "365">("90");

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      generateReport(selectedClientId);
    }
  }, [selectedClientId, timeRange]);

  const loadClients = async () => {
    try {
      const clientsData = await clientService.getAllClients();
      setClients(clientsData);
      if (clientsData.length > 0) {
        setSelectedClientId(clientsData[0].id);
      }
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const generateReport = async (clientId: string) => {
    setLoading(true);
    try {
      const client = await clientService.getClient(clientId);
      if (!client) return;

      const { jobs, candidates } = await clientService.getClientJobsAndCandidates(clientId);
      const interviews = await interviewService.getInterviewsForClient(clientId);
      const feedback = await clientService.getClientFeedback(clientId);

      // Calculate metrics
      const hiredCandidates = candidates.filter(c => c.status === "hired");
      const hireRate = candidates.length > 0 ? (hiredCandidates.length / candidates.length) * 100 : 0;

      // Calculate average time to hire (simplified)
      const avgTimeToHire = hiredCandidates.length > 0 
        ? hiredCandidates.reduce((sum, candidate) => {
            if (candidate.createdAt) {
              const startDate = new Date(candidate.createdAt);
              const endDate = candidate.updatedAt ? new Date(candidate.updatedAt) : new Date();
              return sum + Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            }
            return sum;
          }, 0) / hiredCandidates.length
        : 0;

      // Group candidates by stage
      const candidatesByStage = candidates.reduce((acc: { stage: string; count: number }[], candidate) => {
        const stage = candidate.stageId || "Unknown";
        const existing = acc.find((item: { stage: string; count: number }) => item.stage === stage);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ stage, count: 1 });
        }
        return acc;
      }, []);

      // Group interviews by outcome
      const interviewsByOutcome = interviews.reduce((acc, interview) => {
        const outcome = interview.outcome || "pending";
        const existing = acc.find(item => item.outcome === outcome);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ outcome, count: 1 });
        }
        return acc;
      }, [] as { outcome: string; count: number }[]);

      // Monthly activity (last 6 months)
      const monthlyActivity = [];
      for (let i = 5; i >= 0; i--) {
        const date = subDays(new Date(), i * 30);
        const month = format(date, "MMM yyyy");
        const monthStart = subDays(date, 15);
        const monthEnd = new Date(date.getTime() + 15 * 24 * 60 * 60 * 1000);

        const candidatesInMonth = candidates.filter(c => {
          if (!c.createdAt) return false;
          const createdDate = new Date(c.createdAt);
          return createdDate >= monthStart && createdDate <= monthEnd;
        }).length;

        const interviewsInMonth = interviews.filter(i => {
          const interviewDate = new Date(i.scheduledDate);
          return interviewDate >= monthStart && interviewDate <= monthEnd;
        }).length;

        monthlyActivity.push({
          month,
          candidates: candidatesInMonth,
          interviews: interviewsInMonth,
        });
      }

      setReportData({
        client,
        jobs: jobs as Job[],
        candidates: candidates as Candidate[],
        interviews,
        feedback,
        hireRate,
        avgTimeToHire,
        candidatesByStage,
        interviewsByOutcome,
        monthlyActivity,
      });
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;

    const reportText = `
Client Report: ${reportData.client.name} - ${reportData.client.companyName}
Generated: ${format(new Date(), "PPP")}

Summary:
- Total Jobs: ${reportData.jobs.length}
- Total Candidates: ${reportData.candidates.length}
- Total Interviews: ${reportData.interviews.length}
- Hire Rate: ${reportData.hireRate.toFixed(1)}%
- Average Time to Hire: ${reportData.avgTimeToHire.toFixed(0)} days

Candidates by Stage:
${reportData.candidatesByStage.map(s => `- ${s.stage}: ${s.count}`).join('\n')}

Interview Outcomes:
${reportData.interviewsByOutcome.map(o => `- ${o.outcome}: ${o.count}`).join('\n')}
    `;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `client-report-${reportData.client.companyName}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Reports</h1>
          <p className="text-muted-foreground">
            Analyze client hiring performance and candidate progress
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport} disabled={!reportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Client Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Client</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a client to analyze" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name} - {client.companyName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-muted-foreground">Generating report...</p>
        </div>
      )}

      {reportData && !loading && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Active Jobs</span>
                </div>
                <div className="text-2xl font-bold">{reportData.jobs.length}</div>
                <div className="text-xs text-muted-foreground">
                  {reportData.jobs.filter(j => j.status === "active").length} currently open
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Total Candidates</span>
                </div>
                <div className="text-2xl font-bold">{reportData.candidates.length}</div>
                <div className="text-xs text-muted-foreground">
                  Across all jobs
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Hire Rate</span>
                </div>
                <div className="text-2xl font-bold">{reportData.hireRate.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">
                  Success percentage
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Avg Time to Hire</span>
                </div>
                <div className="text-2xl font-bold">{reportData.avgTimeToHire.toFixed(0)}</div>
                <div className="text-xs text-muted-foreground">
                  days
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Candidates by Stage */}
            <Card>
              <CardHeader>
                <CardTitle>Candidates by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={reportData.candidatesByStage}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ stage, percent }) => `${stage} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {reportData.candidatesByStage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Interview Outcomes */}
            <Card>
              <CardHeader>
                <CardTitle>Interview Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.interviewsByOutcome}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="outcome" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Activity Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.monthlyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="candidates" stroke="#8884d8" name="Candidates" />
                  <Line type="monotone" dataKey="interviews" stroke="#82ca9d" name="Interviews" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Client Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Received By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.feedback.slice(0, 10).map((feedback) => (
                    <TableRow key={feedback.id}>
                      <TableCell>
                        {format(new Date(feedback.feedbackDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{feedback.feedbackType}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {feedback.rating || 0}/5
                          {(feedback.rating || 0) >= 4 ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (feedback.rating || 0) <= 2 ? (
                            <XCircle className="h-3 w-3 text-red-500" />
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {feedback.feedback}
                      </TableCell>
                      <TableCell>{feedback.receivedBy}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {reportData.feedback.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No feedback recorded yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
