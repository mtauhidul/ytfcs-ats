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

interface Stage {
  id: string;
  title: string;
  order: number;
  color?: string;
}

interface Candidate {
  id: string;
  name: string;
  stageId?: string;
  rating?: number;
  tags?: string[];
  createdAt?: string;
}

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
    };
  });

  // Add "unassigned" for candidates without a stage
  const unassignedCount = candidates.filter((c) => !c.stageId).length;
  if (unassignedCount > 0) {
    candidatesByStage.push({
      name: "Unassigned",
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

  if (loading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted/50 rounded-md w-1/3 mx-auto"></div>
          <div className="h-4 bg-muted/50 rounded-md w-1/2 mx-auto"></div>
          <div className="h-64 bg-muted/50 rounded-md w-full mx-auto mt-8"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <LineChart className="size-6" />
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">
            Overview of your hiring process
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1">
              <Users className="size-4" />
              Total Candidates
            </CardTitle>
            <CardDescription>All candidates in system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCandidates}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1">
              <Calendar className="size-4" />
              Interview Rate
            </CardTitle>
            <CardDescription>Candidates who reached interview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalCandidates
                ? Math.round((interviewedCount / totalCandidates) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1">
              <CheckCircle2 className="size-4" />
              Offer Rate
            </CardTitle>
            <CardDescription>Candidates with offers extended</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalCandidates
                ? Math.round((offerExtendedCount / totalCandidates) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-1">
              <FileCheck className="size-4" />
              Active Stages
            </CardTitle>
            <CardDescription>Workflow stages in use</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stages.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="candidates">
        <TabsList className="mb-4">
          <TabsTrigger value="candidates">Candidates by Stage</TabsTrigger>
          <TabsTrigger value="overview">Hiring Funnel</TabsTrigger>
        </TabsList>

        <TabsContent value="candidates">
          <Card>
            <CardHeader>
              <CardTitle>Candidates by Stage</CardTitle>
              <CardDescription>
                Distribution of candidates across stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={candidatesByStage}>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Hiring Funnel Overview</CardTitle>
              <CardDescription>Visualize your hiring pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={candidatesByStage}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {candidatesByStage.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={pieColors[index % pieColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
