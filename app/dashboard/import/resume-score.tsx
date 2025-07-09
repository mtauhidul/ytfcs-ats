// app/dashboard/import/resume-score.tsx

import {
  AlertCircle,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { CustomProgress } from "~/components/ui/custom-progress";
import { cn } from "~/lib/utils";

interface ComponentScore {
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  jobTitleScore: number;
  certScore: number;
}

interface ScoreMetadata {
  jobId: string;
  jobTitle: string;
  scoredAt: string;
}

// Legacy scoring data structure
interface LegacyScoreBreakdown {
  skillsMatch: number;
  experienceMatch: number;
  educationMatch: number;
  jobTitleMatch?: number;
  certMatch?: number;
}

export interface ResumeScoreData {
  finalScore: number;
  componentScores?: ComponentScore;
  matchedSkills?: string[];
  missingSkills?: string[];
  feedback?: string;
  metadata?: ScoreMetadata;
  // Legacy support
  breakdown?: LegacyScoreBreakdown;
}

interface ResumeScoreProps {
  score: ResumeScoreData | null;
  loading: boolean;
  className?: string;
}

export default function ResumeScore({
  score,
  loading,
  className = "",
}: ResumeScoreProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Helper to get background color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-700 border-green-300";
    if (score >= 60) return "bg-blue-100 text-blue-700 border-blue-300";
    if (score >= 40) return "bg-amber-100 text-amber-700 border-amber-300";
    return "bg-red-100 text-red-700 border-red-300";
  };

  // Helper to get text color based on score
  const getTextColor = (score: number) => {
    if (score >= 80) return "text-green-700";
    if (score >= 60) return "text-blue-700";
    if (score >= 40) return "text-amber-700";
    return "text-red-700";
  };

  // Helper to get indicator color for progress
  const getIndicatorColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  // If loading, show spinner
  if (loading) {
    return (
      <div className={`border rounded-lg p-4 ${className}`}>
        <div className="flex flex-col items-center justify-center py-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">
            Calculating match score...
          </p>
        </div>
      </div>
    );
  }

  // If no score, show empty state
  if (!score) {
    return (
      <div className={`border rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Resume Score</h3>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-6">
          <p className="text-sm text-muted-foreground">
            No match score available
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Select a job to calculate a resume match score
          </p>
        </div>
      </div>
    );
  }

  // Handle both legacy and new data structures
  const componentScores = score.componentScores || (score.breakdown ? {
    skillScore: score.breakdown.skillsMatch || 0,
    experienceScore: score.breakdown.experienceMatch || 0,
    educationScore: score.breakdown.educationMatch || 0,
    jobTitleScore: score.breakdown.jobTitleMatch || 0,
    certScore: score.breakdown.certMatch || 0,
  } : {
    skillScore: 0,
    experienceScore: 0,
    educationScore: 0,
    jobTitleScore: 0,
    certScore: 0,
  });

  const matchedSkills = score.matchedSkills || [];
  const missingSkills = score.missingSkills || [];
  const feedback = score.feedback || "No detailed feedback available.";

  // Format the score date if it exists
  const scoreDate = score?.metadata?.scoredAt
    ? new Date(score.metadata.scoredAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "N/A";

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`}>
      {/* Score Header */}
      <div className="p-4 bg-muted/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BadgeCheck
              className={cn("h-5 w-5", getTextColor(score.finalScore))}
            />
            <h3 className="font-medium">Resume Match Score</h3>
          </div>
          <Badge
            className={cn(
              "px-2.5 py-0.5 text-sm",
              getScoreColor(score.finalScore)
            )}
          >
            {Math.round(score.finalScore)}%
          </Badge>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Match Score</span>
            <span className={cn("font-medium", getTextColor(score.finalScore))}>
              {Math.round(score.finalScore)}%
            </span>
          </div>
          <CustomProgress
            value={score.finalScore}
            className={cn(
              "h-2",
              score.finalScore >= 80
                ? "bg-green-100"
                : score.finalScore >= 60
                ? "bg-blue-100"
                : score.finalScore >= 40
                ? "bg-amber-100"
                : "bg-red-100"
            )}
            indicatorClassName={getIndicatorColor(score.finalScore)}
          />
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Scored against{" "}
          <span className="font-medium">
            {score.metadata?.jobTitle || "Job"}
          </span>{" "}
          on {scoreDate}
        </div>
      </div>

      {/* Score Details */}
      <div className="p-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium mb-2">Skills Match</h4>
          <div className="flex flex-wrap gap-1.5">
            {matchedSkills.length > 0 ? (
              matchedSkills.map((skill, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                >
                  <BadgeCheck className="h-3 w-3 mr-1" />
                  {skill}
                </Badge>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">
                No matched skills
              </div>
            )}
          </div>
        </div>

        {missingSkills.length > 0 && (
          <div className="mb-3">
            <h4 className="text-sm font-medium mb-2">Missing Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {missingSkills.map((skill, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200"
                >
                  <X className="h-3 w-3 mr-1" />
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full mt-1 text-xs h-8"
        >
          {showDetails ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 mr-1.5" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
              Show Details
            </>
          )}
        </Button>

        {showDetails && (
          <div className="mt-3 border-t pt-3">
            <h4 className="text-sm font-medium mb-2">Component Scores</h4>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Skills (40%)</span>
                  <span className="font-medium">
                    {Math.round(componentScores.skillScore)}%
                  </span>
                </div>
                <CustomProgress
                  value={componentScores.skillScore}
                  className="h-1.5 bg-muted/30"
                  indicatorClassName="bg-blue-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Experience (20%)</span>
                  <span className="font-medium">
                    {Math.round(componentScores.experienceScore)}%
                  </span>
                </div>
                <CustomProgress
                  value={componentScores.experienceScore}
                  className="h-1.5 bg-muted/30"
                  indicatorClassName="bg-green-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Education (10%)</span>
                  <span className="font-medium">
                    {Math.round(componentScores.educationScore)}%
                  </span>
                </div>
                <CustomProgress
                  value={componentScores.educationScore}
                  className="h-1.5 bg-muted/30"
                  indicatorClassName="bg-amber-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Job Title (20%)</span>
                  <span className="font-medium">
                    {Math.round(componentScores.jobTitleScore)}%
                  </span>
                </div>
                <CustomProgress
                  value={componentScores.jobTitleScore}
                  className="h-1.5 bg-muted/30"
                  indicatorClassName="bg-purple-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Certifications (10%)</span>
                  <span className="font-medium">
                    {Math.round(componentScores.certScore)}%
                  </span>
                </div>
                <CustomProgress
                  value={componentScores.certScore}
                  className="h-1.5 bg-muted/30"
                  indicatorClassName="bg-indigo-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Feedback</h4>
              <div className="text-xs text-muted-foreground bg-muted/10 p-3 rounded border">
                {feedback}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
