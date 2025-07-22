// app/dashboard/dashboard/dashboard.tsx

import { collection, onSnapshot, query } from "firebase/firestore";
import {
  Calendar,
  CheckCircle2,
  FileCheck,
  LineChart,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  Cell,
  Pie,
  BarChart as ReBarChart,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { db } from "~/lib/firebase";
import type { Candidate, Stage } from "~/types";

export default function DashboardPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    const candidatesQuery = query(collection(db, "candidates"));
    const stagesQuery = query(collection(db, "stages"));

    const unsubCandidates = onSnapshot(candidatesQuery, (snapshot) => {
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
    });

    const unsubStages = onSnapshot(stagesQuery, (snapshot) => {
      setStages(
        snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Stage)
        )
      );
    });

    return () => {
      unsubCandidates();
      unsubStages();
    };
  }, []);

  // Process data for charts
  const candidatesByStage = stages.map((stage) => {
    const count = candidates.filter((c) => c.stageId === stage.id).length;
    return {
      name: stage.title,
      count,
      // Truncate long names for better display
      shortName:
        stage.title.length > 12
          ? `${stage.title.substring(0, 12)}...`
          : stage.title,
    };
  });

  // Add "unassigned" for candidates without a stage
  const unassignedCount = candidates.filter((c) => !c.stageId).length;
  if (unassignedCount > 0) {
    candidatesByStage.push({
      name: "Unassigned",
      shortName: "Unassigned",
      count: unassignedCount,
    });
  }

  // Calculate hiring funnel metrics
  const totalCandidates = candidates.length;
  const interviewedCount = candidates.filter((c) => {
    const stageInfo = stages.find((s) => s.id === c.stageId);
    return stageInfo && stageInfo.order > 1;
  }).length;

  const offerExtendedCount = candidates.filter((c) => {
    const stageInfo = stages.find((s) => s.id === c.stageId);
    return stageInfo && stageInfo.order > 3;
  }).length;

  const pieColors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  // Custom tooltip for better mobile experience
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-sm">{`${label}`}</p>
          <p className="text-blue-600 text-sm">
            {`Count: ${payload[0].value}`}
          </p>
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
    <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:py-8 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <LineChart className="size-5 sm:size-6" />
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Overview of your hiring process
          </p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-1">
              <Users className="size-4" />
              Total Candidates
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              All candidates in system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {totalCandidates}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-1">
              <Calendar className="size-4" />
              Interview Rate
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Candidates who reached interview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {totalCandidates
                ? Math.round((interviewedCount / totalCandidates) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-1">
              <CheckCircle2 className="size-4" />
              Offer Rate
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Candidates with offers extended
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {totalCandidates
                ? Math.round((offerExtendedCount / totalCandidates) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-1">
              <FileCheck className="size-4" />
              Active Stages
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Workflow stages in use
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {stages.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-base flex items-center gap-1">
              <Users className="size-4" />
              Interview Activity
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Total interviews scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold">
              {candidates.reduce((total, candidate) => {
                return total + (candidate.interviewHistory?.length || 0);
              }, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="candidates" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="candidates" className="text-xs sm:text-sm">
            Candidates by Stage
          </TabsTrigger>
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            Hiring Funnel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="candidates">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">
                Candidates by Stage
              </CardTitle>
              <CardDescription className="text-sm">
                Distribution of candidates across stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] sm:h-[350px] w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart
                    data={candidatesByStage}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  >
                    <XAxis
                      dataKey="shortName"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                      interval={0}
                    />
                    <YAxis allowDecimals={false} fontSize={12} width={40} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]} />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">
                Hiring Funnel Overview
              </CardTitle>
              <CardDescription className="text-sm">
                Visualize your hiring pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] sm:h-[350px] w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={candidatesByStage}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius="70%"
                      fill="#8884d8"
                      dataKey="count"
                      label={({ name, percent }) => {
                        // Only show label if percentage is significant enough
                        return percent > 0.05
                          ? `${name}: ${(percent * 100).toFixed(0)}%`
                          : "";
                      }}
                    >
                      {candidatesByStage.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={pieColors[index % pieColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [value, name]}
                      labelFormatter={(label) => `Stage: ${label}`}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend for mobile */}
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {candidatesByStage.map((entry, index) => (
                  <div
                    key={entry.name}
                    className="flex items-center gap-1 text-xs"
                  >
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{
                        backgroundColor: pieColors[index % pieColors.length],
                      }}
                    />
                    <span className="truncate max-w-[100px]">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
