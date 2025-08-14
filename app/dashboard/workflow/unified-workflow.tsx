"use client";

import { BriefcaseIcon, Users } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import JobWorkflowPage from "./job-workflow";
import WorkflowPage from "./workflow";

export default function UnifiedWorkflowPage() {
  const [activeTab, setActiveTab] = useState<"global" | "job-specific">(
    "job-specific"
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col gap-4 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary">
                <BriefcaseIcon className="h-4 w-4" />
              </div>
              Workflow Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage candidate workflows across your hiring pipeline
            </p>
          </div>
        </div>

        {/* Workflow Type Toggle */}
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "global" | "job-specific")
          }
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger
              value="job-specific"
              className="flex items-center gap-2"
            >
              <BriefcaseIcon className="h-4 w-4" />
              Job-Specific
            </TabsTrigger>
            <TabsTrigger value="global" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Global View
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "job-specific" ? <JobWorkflowPage /> : <WorkflowPage />}
      </div>
    </div>
  );
}
