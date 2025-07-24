// app/dashboard/dashboard/dashboard.tsx

import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  Bar,
  Cell,
  Legend,
  Pie,
  AreaChart as ReAreaChart,
  BarChart as ReBarChart,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { db } from "~/lib/firebase";
import type { Candidate, Job, Stage } from "~/types";

export default function DashboardPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data with real-time updates
  useEffect(() => {
    const candidatesQuery = query(collection(db, "candidates"));
    const stagesQuery = query(
      collection(db, "stages"),
      orderBy("order", "asc")
    );
    const jobsQuery = query(collection(db, "jobs"));
    const teamQuery = query(collection(db, "teamMembers"));

    const unsubscribers = [
      onSnapshot(candidatesQuery, (snapshot) => {
        setCandidates(
          snapshot.docs.map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              } as Candidate)
          )
        );
        setLoading(false);
      }),
      onSnapshot(stagesQuery, (snapshot) => {
        setStages(
          snapshot.docs.map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              } as Stage)
          )
        );
      }),
      onSnapshot(jobsQuery, (snapshot) => {
        setJobs(
          snapshot.docs.map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              } as Job)
          )
        );
      }),
      onSnapshot(teamQuery, (snapshot) => {
        setTeamMembers(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
      }),
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
  }, []);

  // Enhanced analytics calculations
  const totalCandidates = candidates.length;
  const activeJobs = jobs.filter((job) => job.statusId !== "closed").length;
  const totalInterviews = candidates.reduce((total, candidate) => {
    return total + (candidate.interviewHistory?.length || 0);
  }, 0);

  // Time-based metrics (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentCandidates = candidates.filter(
    (c) => c.createdAt && new Date(c.createdAt) > thirtyDaysAgo
  ).length;

  const recentInterviews = candidates.reduce((total, candidate) => {
    const recentInterviewCount = (candidate.interviewHistory || []).filter(
      (interview) => new Date(interview.interviewDate) > thirtyDaysAgo
    ).length;
    return total + recentInterviewCount;
  }, 0);

  // Stage analysis
  const candidatesByStage = stages.map((stage) => {
    const count = candidates.filter((c) => c.stageId === stage.id).length;
    const percentage = totalCandidates
      ? Math.round((count / totalCandidates) * 100)
      : 0;
    return {
      name: stage.title,
      count,
      percentage,
      order: stage.order,
      shortName:
        stage.title.length > 12
          ? `${stage.title.substring(0, 12)}...`
          : stage.title,
    };
  });

  // Add unassigned candidates
  const unassignedCount = candidates.filter((c) => !c.stageId).length;
  if (unassignedCount > 0) {
    candidatesByStage.push({
      name: "Unassigned",
      shortName: "Unassigned",
      count: unassignedCount,
      percentage: Math.round((unassignedCount / totalCandidates) * 100),
      order: 999,
    });
  }

  // Hiring funnel metrics
  const sortedStages = candidatesByStage.sort((a, b) => a.order - b.order);
  const funnelData = sortedStages.map((stage, index) => ({
    ...stage,
    conversionRate:
      index > 0
        ? sortedStages[index - 1]?.count > 0
          ? Math.round((stage.count / sortedStages[index - 1].count) * 100)
          : 0
        : 100,
  }));

  // Interview outcomes analysis
  const interviewOutcomes = {
    passed: 0,
    rejected: 0,
    pending: 0,
  };

  candidates.forEach((candidate) => {
    (candidate.interviewHistory || []).forEach((interview) => {
      if (
        interview.outcome &&
        interviewOutcomes.hasOwnProperty(interview.outcome)
      ) {
        interviewOutcomes[
          interview.outcome as keyof typeof interviewOutcomes
        ]++;
      }
    });
  });

  const interviewData = [
    { name: "Passed", value: interviewOutcomes.passed, color: "#22c55e" },
    { name: "Rejected", value: interviewOutcomes.rejected, color: "#ef4444" },
    { name: "Pending", value: interviewOutcomes.pending, color: "#f59e0b" },
  ].filter((item) => item.value > 0);

  // Team performance metrics
  const clientMembers = teamMembers.filter(
    (member) => member.role === "Client"
  );
  const interviewersData = clientMembers
    .map((member) => {
      const memberInterviews = candidates.reduce((total, candidate) => {
        return (
          total +
          (candidate.interviewHistory || []).filter(
            (interview) => interview.interviewerId === member.id
          ).length
        );
      }, 0);

      return {
        name: member.name,
        interviews: memberInterviews,
      };
    })
    .filter((item) => item.interviews > 0);

  // Weekly trend data (last 8 weeks)
  const weeklyData = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekCandidates = candidates.filter((c) => {
      if (!c.createdAt) return false;
      const createdDate = new Date(c.createdAt);
      return createdDate >= weekStart && createdDate <= weekEnd;
    }).length;

    const weekInterviews = candidates.reduce((total, candidate) => {
      return (
        total +
        (candidate.interviewHistory || []).filter((interview) => {
          const interviewDate = new Date(interview.interviewDate);
          return interviewDate >= weekStart && interviewDate <= weekEnd;
        }).length
      );
    }, 0);

    weeklyData.push({
      week: `Week ${8 - i}`,
      candidates: weekCandidates,
      interviews: weekInterviews,
      date: weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    });
  }

  // Key insights
  const insights = [];

  if (recentCandidates > 0) {
    insights.push({
      type: "positive",
      message: `${recentCandidates} new candidates added in the last 30 days`,
      icon: TrendingUp,
    });
  }

  if (interviewOutcomes.pending > 5) {
    insights.push({
      type: "warning",
      message: `${interviewOutcomes.pending} interviews pending review`,
      icon: AlertCircle,
    });
  }

  if (activeJobs === 0) {
    insights.push({
      type: "info",
      message: "No active job postings - consider adding new positions",
      icon: Briefcase,
    });
  }

  // Calculate hiring funnel metrics for existing stats
  const interviewedCount = candidates.filter((c) => {
    const stageInfo = stages.find((s) => s.id === c.stageId);
    return stageInfo && stageInfo.order > 1;
  }).length;

  const offerExtendedCount = candidates.filter((c) => {
    const stageInfo = stages.find((s) => s.id === c.stageId);
    return stageInfo && stageInfo.order > 3;
  }).length;

  const pieColors = [
    "#0088FE", // Original bright blue
    "#00C49F", // Original teal green
    "#FFBB28", // Original yellow
    "#FF8042", // Original orange
    "#8884d8", // Original purple
    "#82ca9d", // Original light green
  ];

  // Custom tooltip for better mobile experience
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-sm">{`${label}`}</p>
          <p className="text-primary text-sm">{`Count: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-4 px-4 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted/50 rounded-md w-2/3 sm:w-1/3 mx-auto"></div>
          <div className="h-4 bg-muted/50 rounded-md w-3/4 sm:w-1/2 mx-auto"></div>
          <div className="h-64 bg-muted/50 rounded-md w-full mx-auto mt-8"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-3 px-3 sm:py-6 sm:px-6 lg:py-8 lg:px-8 max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
          <div className="space-y-1">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Analytics Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Real-time hiring insights and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Badge
              variant="outline"
              className="bg-green-50 border-green-200 text-green-700 text-xs animate-pulse"
            >
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>
              Live Data
            </Badge>
            <Badge
              variant="secondary"
              className="text-xs hidden sm:inline-flex"
            >
              Last updated: {new Date().toLocaleTimeString()}
            </Badge>
          </div>
        </div>

        {/* Key Insights */}
        {insights.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-medium mb-3 flex items-center gap-2">
              <Activity className="size-4 sm:size-5" />
              Key Insights
            </h2>
            <div className="grid gap-2 sm:gap-3">
              {insights.map((insight, index) => (
                <Card
                  key={index}
                  className={`border-l-4 ${
                    insight.type === "positive"
                      ? "border-l-green-500 bg-green-50/50"
                      : insight.type === "warning"
                      ? "border-l-yellow-500 bg-yellow-50/50"
                      : "border-l-primary bg-muted/30"
                  }`}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <insight.icon
                        className={`size-4 sm:size-5 flex-shrink-0 ${
                          insight.type === "positive"
                            ? "text-green-600"
                            : insight.type === "warning"
                            ? "text-yellow-600"
                            : "text-primary"
                        }`}
                      />
                      <p className="text-xs sm:text-sm font-medium leading-tight">
                        {insight.message}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardHeader className="pb-0 p-1.5 sm:p-2">
              <CardTitle className="text-xs flex items-center gap-1 min-h-0">
                <Users className="size-3 text-blue-600 flex-shrink-0" />
                <span className="truncate leading-none">Candidates</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 sm:p-2 pt-0.5">
              <div className="text-base sm:text-2xl font-bold text-blue-900">
                {totalCandidates}
              </div>
              <p className="text-xs text-blue-700 truncate">
                +{recentCandidates} this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
            <CardHeader className="pb-0 p-1.5 sm:p-2">
              <CardTitle className="text-xs flex items-center gap-1 min-h-0">
                <Calendar className="size-3 text-emerald-600 flex-shrink-0" />
                <span className="truncate leading-none">Interviews</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 sm:p-2 pt-0.5">
              <div className="text-base sm:text-2xl font-bold text-emerald-900">
                {totalInterviews}
              </div>
              <p className="text-xs text-emerald-700 truncate">
                +{recentInterviews} this month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
            <CardHeader className="pb-0 p-1.5 sm:p-2">
              <CardTitle className="text-xs flex items-center gap-1 min-h-0">
                <Activity className="size-3 text-amber-600 flex-shrink-0" />
                <span className="truncate leading-none">Interview Rate</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 sm:p-2 pt-0.5">
              <div className="text-base sm:text-2xl font-bold text-amber-900">
                {totalCandidates
                  ? Math.round((interviewedCount / totalCandidates) * 100)
                  : 0}
                %
              </div>
              <p className="text-xs text-amber-700 truncate">To interview</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardHeader className="pb-0 p-1.5 sm:p-2">
              <CardTitle className="text-xs flex items-center gap-1 min-h-0">
                <CheckCircle className="size-3 text-green-600 flex-shrink-0" />
                <span className="truncate leading-none">Offer Rate</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 sm:p-2 pt-0.5">
              <div className="text-base sm:text-2xl font-bold text-green-900">
                {totalCandidates
                  ? Math.round((offerExtendedCount / totalCandidates) * 100)
                  : 0}
                %
              </div>
              <p className="text-xs text-green-700 truncate">Final stage</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
            <CardHeader className="pb-0 p-1.5 sm:p-2">
              <CardTitle className="text-xs flex items-center gap-1 min-h-0">
                <Briefcase className="size-3 text-purple-600 flex-shrink-0" />
                <span className="truncate leading-none">Jobs</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 sm:p-2 pt-0.5">
              <div className="text-base sm:text-2xl font-bold text-purple-900">
                {activeJobs}
              </div>
              <p className="text-xs text-purple-700 truncate">Open positions</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-200">
            <CardHeader className="pb-0 p-1.5 sm:p-2">
              <CardTitle className="text-xs flex items-center gap-1 min-h-0">
                <User className="size-3 text-cyan-600 flex-shrink-0" />
                <span className="truncate leading-none">Team</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-1.5 sm:p-2 pt-0.5">
              <div className="text-base sm:text-2xl font-bold text-cyan-900">
                {clientMembers.length}
              </div>
              <p className="text-xs text-cyan-700 truncate">Members</p>
            </CardContent>
          </Card>
        </div>

        {/* Hiring Funnel Progress */}
        <div className="mb-4 sm:mb-6">
          <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-sm">
            <CardHeader className="p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg border-b border-blue-100">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-800">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-sm">
                  <Target className="size-4 sm:size-5 text-white" />
                </div>
                Hiring Funnel Progress
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-600">
                Track candidate progression through each stage
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-6">
              <div className="space-y-4 sm:space-y-5">
                {funnelData.map((stage, index) => (
                  <div key={stage.name} className="relative">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white ${
                            stage.percentage > 0
                              ? "bg-gradient-to-r from-blue-500 to-indigo-600 shadow-sm"
                              : "bg-gray-400"
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-gray-900 block">
                            {stage.name}
                          </span>
                          <span className="text-xs text-gray-600">
                            {stage.count} candidates
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-11 sm:ml-0">
                        <div className="flex flex-col items-end">
                          <Badge
                            variant="secondary"
                            className={`text-xs font-medium border ${
                              stage.percentage > 50
                                ? "bg-green-50 text-green-700 border-green-200"
                                : stage.percentage > 20
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {stage.percentage}% of total
                          </Badge>
                          {index > 0 && (
                            <span className="text-xs text-gray-500 mt-1">
                              {stage.conversionRate}% from previous
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-11 sm:ml-0">
                      <div className="relative">
                        <Progress
                          value={stage.percentage}
                          className="h-3 bg-gray-100"
                        />
                      </div>
                    </div>
                    {index < funnelData.length - 1 && (
                      <div className="flex justify-start ml-4 mt-2 mb-1">
                        <div className="w-px h-4 bg-gradient-to-b from-gray-300 to-transparent"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Charts Section */}
        <Tabs defaultValue="stages" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4 h-auto">
            <TabsTrigger
              value="stages"
              className="text-xs sm:text-sm p-2 sm:p-3"
            >
              Pipeline
            </TabsTrigger>
            <TabsTrigger
              value="trends"
              className="text-xs sm:text-sm p-2 sm:p-3"
            >
              Trends
            </TabsTrigger>
            <TabsTrigger
              value="interviews"
              className="text-xs sm:text-sm p-2 sm:p-3"
            >
              Interviews
            </TabsTrigger>
            <TabsTrigger value="team" className="text-xs sm:text-sm p-2 sm:p-3">
              Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stages">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <BarChart3 className="size-4 sm:size-5" />
                  Candidates by Stage
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Distribution across hiring pipeline stages
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="h-[280px] sm:h-[350px] w-full overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart
                      data={candidatesByStage}
                      margin={{ top: 20, right: 10, left: 10, bottom: 60 }}
                    >
                      <XAxis
                        dataKey="shortName"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={10}
                        interval={0}
                      />
                      <YAxis allowDecimals={false} fontSize={10} width={30} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="count"
                        fill="#8884d8"
                        radius={[4, 4, 0, 0]}
                        name="Candidates"
                      />
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <TrendingUp className="size-4 sm:size-5" />
                  Weekly Trends
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Candidate and interview activity over the last 8 weeks
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="h-[280px] sm:h-[350px] w-full overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReAreaChart
                      data={weeklyData}
                      margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
                    >
                      <XAxis dataKey="date" fontSize={10} />
                      <YAxis allowDecimals={false} fontSize={10} width={30} />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="candidates"
                        stackId="1"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                        name="New Candidates"
                      />
                      <Area
                        type="monotone"
                        dataKey="interviews"
                        stackId="2"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.6}
                        name="Interviews"
                      />
                    </ReAreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="interviews">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <CheckCircle className="size-4 sm:size-5" />
                    Interview Outcomes
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Distribution of interview results
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <div className="h-[250px] sm:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={interviewData}
                          cx="50%"
                          cy="50%"
                          outerRadius="60%"
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) =>
                            percent > 0.1
                              ? `${name}: ${(percent * 100).toFixed(0)}%`
                              : ""
                          }
                        >
                          {interviewData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {interviewData.map((entry, index) => (
                      <div
                        key={entry.name}
                        className="flex items-center gap-1 text-xs"
                      >
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="whitespace-nowrap">
                          {entry.name}: {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Clock className="size-4 sm:size-5" />
                    Interview Statistics
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Key interview metrics and insights
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-lg sm:text-2xl font-bold text-green-700">
                        {interviewOutcomes.passed}
                      </div>
                      <div className="text-xs sm:text-sm text-green-600">
                        Passed
                      </div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-lg sm:text-2xl font-bold text-red-700">
                        {interviewOutcomes.rejected}
                      </div>
                      <div className="text-xs sm:text-sm text-red-600">
                        Rejected
                      </div>
                    </div>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-lg sm:text-2xl font-bold text-yellow-700">
                      {interviewOutcomes.pending}
                    </div>
                    <div className="text-xs sm:text-sm text-yellow-600">
                      Pending Review
                    </div>
                  </div>

                  {totalInterviews > 0 && (
                    <div className="pt-3 sm:pt-4 border-t">
                      <div className="text-sm font-medium mb-2">
                        Success Rate
                      </div>
                      <Progress
                        value={Math.round(
                          (interviewOutcomes.passed / totalInterviews) * 100
                        )}
                        className="h-3"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round(
                          (interviewOutcomes.passed / totalInterviews) * 100
                        )}
                        % of interviews result in progression
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Users className="size-4 sm:size-5" />
                  Team Performance
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Interview activity by team members
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {interviewersData.length > 0 ? (
                  <div className="h-[280px] sm:h-[350px] w-full overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart
                        data={interviewersData}
                        margin={{ top: 20, right: 10, left: 10, bottom: 60 }}
                      >
                        <XAxis
                          dataKey="name"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          fontSize={10}
                          interval={0}
                        />
                        <YAxis allowDecimals={false} fontSize={10} width={30} />
                        <Tooltip />
                        <Bar
                          dataKey="interviews"
                          fill="#82ca9d"
                          radius={[4, 4, 0, 0]}
                          name="Interviews Conducted"
                        />
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    <Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm sm:text-base">
                      No interview data available
                    </p>
                    <p className="text-xs sm:text-sm mt-1">
                      Add team members with Client role to track interviews
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
