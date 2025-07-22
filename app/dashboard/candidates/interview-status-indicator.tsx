// app/dashboard/candidates/interview-status-indicator.tsx
"use client";

import { AlertTriangle, CheckCircle, Clock, Users } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { Candidate } from "~/types";

interface InterviewStatusIndicatorProps {
  candidate: Candidate;
}

export default function InterviewStatusIndicator({
  candidate,
}: InterviewStatusIndicatorProps) {
  if (!candidate.interviewHistory || candidate.interviewHistory.length === 0) {
    return null;
  }

  const totalInterviews = candidate.interviewHistory.length;
  const uniqueClients = new Set(
    candidate.interviewHistory.map((interview) => interview.interviewerId)
  ).size;
  const pendingInterviews = candidate.interviewHistory.filter(
    (interview) => interview.outcome === "pending" || !interview.outcome
  ).length;
  const passedInterviews = candidate.interviewHistory.filter(
    (interview) => interview.outcome === "passed"
  ).length;
  const rejectedInterviews = candidate.interviewHistory.filter(
    (interview) => interview.outcome === "rejected"
  ).length;

  // Generate tooltip content
  const getTooltipContent = () => {
    const clientNames = Array.from(
      new Set(
        candidate.interviewHistory!.map(
          (interview) => interview.interviewerName
        )
      )
    );

    return (
      <div className="space-y-2">
        <div className="font-semibold">Interview Summary:</div>
        <div className="text-sm space-y-1">
          <div>Total interviews: {totalInterviews}</div>
          <div>Unique clients: {uniqueClients}</div>
          {pendingInterviews > 0 && (
            <div className="text-yellow-600">Pending: {pendingInterviews}</div>
          )}
          {passedInterviews > 0 && (
            <div className="text-green-600">Passed: {passedInterviews}</div>
          )}
          {rejectedInterviews > 0 && (
            <div className="text-red-600">Rejected: {rejectedInterviews}</div>
          )}
        </div>
        <div className="border-t pt-2">
          <div className="text-sm font-medium mb-1">Interviewed by:</div>
          <div className="text-xs space-y-1">
            {clientNames.map((name, idx) => (
              <div key={idx}>• {name}</div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Determine the main status icon and color
  const getStatusInfo = () => {
    if (pendingInterviews > 0) {
      return {
        icon: Clock,
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
        label: "Pending",
      };
    } else if (passedInterviews > 0) {
      return {
        icon: CheckCircle,
        color: "bg-green-100 text-green-800 border-green-300",
        label: "Passed",
      };
    } else if (rejectedInterviews > 0) {
      return {
        icon: AlertTriangle,
        color: "bg-red-100 text-red-800 border-red-300",
        label: "Rejected",
      };
    } else {
      return {
        icon: Users,
        color: "bg-blue-100 text-blue-800 border-blue-300",
        label: "Interviewed",
      };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <Badge
              variant="outline"
              className={`text-xs px-2 py-1 ${statusInfo.color}`}
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {totalInterviews}
            </Badge>
            {uniqueClients > 1 && (
              <Badge
                variant="outline"
                className="text-xs px-1 py-1 bg-orange-100 text-orange-800 border-orange-300"
              >
                <Users className="h-3 w-3" />
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
