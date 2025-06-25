// app/dashboard/candidates/score-detail.tsx

import { BadgeCheck, ChevronDown, ChevronUp, Info, Zap } from "lucide-react";
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

export interface ResumeScoreDetails {
  finalScore: number;
  componentScores: ComponentScore;
  matchedSkills: string[];
  missingSkills: string[];
  feedback: string;
  metadata: ScoreMetadata;
}

interface ScoreDetailProps {
  scoreDetails?: ResumeScoreDetails;
  score?: number;
  jobTitle?: string;
  jobId?: string;
  scoredAt?: string;
}

export default function ScoreDetail({
  scoreDetails,
  score,
  jobTitle,
  jobId,
  scoredAt,
}: ScoreDetailProps) {
  const [showDetails, setShowDetails] = useState(false);

  // If no score data is available
  if (!scoreDetails && !score) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center border rounded-md">
        <Info className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <h3 className="text-sm font-medium">No Resume Score</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          This candidate hasn't been scored against a job posting yet.
        </p>
      </div>
    );
  }

  if (!scoreDetails && score) {
    // Safely format the date if scoredAt exists
    const formattedDate = scoredAt
      ? new Date(scoredAt).toLocaleDateString()
      : "Unknown date";

    return (
      <div className="border rounded-md p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BadgeCheck
              className={cn(
                "h-5 w-5",
                score >= 80
                  ? "text-green-500"
                  : score >= 60
                  ? "text-blue-500"
                  : score >= 40
                  ? "text-amber-500"
                  : "text-red-500"
              )}
            />
            <h3 className="font-medium">Resume Match Score</h3>
          </div>
          <Badge
            className={cn(
              "px-2.5 py-1 font-medium",
              score >= 80
                ? "bg-green-100 text-green-700 border-green-200"
                : score >= 60
                ? "bg-blue-100 text-blue-700 border-blue-200"
                : score >= 40
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-red-100 text-red-700 border-red-200"
            )}
          >
            {Math.round(score)}%
          </Badge>
        </div>
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Match Score</span>
            <span
              className={cn(
                "font-medium",
                score >= 80
                  ? "text-green-600"
                  : score >= 60
                  ? "text-blue-600"
                  : score >= 40
                  ? "text-amber-600"
                  : "text-red-600"
              )}
            >
              {Math.round(score)}%
            </span>
          </div>
          <CustomProgress
            value={score}
            className="h-2.5"
            indicatorClassName={cn(
              score >= 80
                ? "bg-green-500"
                : score >= 60
                ? "bg-blue-500"
                : score >= 40
                ? "bg-amber-500"
                : "bg-red-500"
            )}
          />
        </div>

        <div className="flex flex-col space-y-2 mt-4 bg-muted/10 p-3 rounded-md border">
          {jobTitle && (
            <div className="flex items-center">
              <span className="text-muted-foreground text-sm w-24">Job:</span>
              <span className="font-medium text-sm">{jobTitle}</span>
            </div>
          )}

          {scoredAt && (
            <div className="flex items-center">
              <span className="text-muted-foreground text-sm w-24">
                Scored on:
              </span>
              <span className="text-sm">{formattedDate}</span>
            </div>
          )}

          <div className="flex items-start pt-2">
            <span className="text-muted-foreground text-sm w-24">Note:</span>
            <span className="text-sm text-muted-foreground">
              Detailed component scores and skill matching information is not
              available for this score.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Full detailed score view
  const details = scoreDetails!;
  const finalScore = details.finalScore;
  const metadata = details.metadata || {
    jobId: "",
    jobTitle: "Unknown Job",
    scoredAt: new Date().toISOString(),
  };

  // Format the score date safely
  const scoreDate = metadata?.scoredAt
    ? new Date(metadata.scoredAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Unknown date";

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Score Header */}
      <div className="p-4 bg-muted/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BadgeCheck
              className={cn(
                "h-5 w-5",
                finalScore >= 80
                  ? "text-green-500"
                  : finalScore >= 60
                  ? "text-blue-500"
                  : finalScore >= 40
                  ? "text-amber-500"
                  : "text-red-500"
              )}
            />
            <h3 className="font-medium">Resume Match Score</h3>
          </div>
          {/* <Badge
            className={cn(
              "px-2.5 py-0.5 text-sm",
              finalScore >= 80
                ? "bg-green-100 text-green-700 border-green-200"
                : finalScore >= 60
                ? "bg-blue-100 text-blue-700 border-blue-200"
                : finalScore >= 40
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : "bg-red-100 text-red-700 border-red-200"
            )}
          >
            {Math.round(finalScore)}%
          </Badge> */}
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Match Score</span>
            <span
              className={cn(
                "font-medium",
                finalScore >= 80
                  ? "text-green-600"
                  : finalScore >= 60
                  ? "text-blue-600"
                  : finalScore >= 40
                  ? "text-amber-600"
                  : "text-red-600"
              )}
            >
              {Math.round(finalScore)}%
            </span>
          </div>
          <CustomProgress
            value={finalScore}
            className={cn(
              "h-2",
              finalScore >= 80
                ? "bg-green-100"
                : finalScore >= 60
                ? "bg-blue-100"
                : finalScore >= 40
                ? "bg-amber-100"
                : "bg-red-100"
            )}
            indicatorClassName={cn(
              finalScore >= 80
                ? "bg-green-500"
                : finalScore >= 60
                ? "bg-blue-500"
                : finalScore >= 40
                ? "bg-amber-500"
                : "bg-red-500"
            )}
          />
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Scored against{" "}
          <span className="font-medium">
            {metadata?.jobTitle || "Unknown Job"}
          </span>{" "}
          on {scoreDate}
        </div>
      </div>

      {/* Score Details */}
      <div className="p-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium mb-2">Skills Match</h4>
          <div className="flex flex-wrap gap-1.5">
            {details.matchedSkills.length > 0 ? (
              details.matchedSkills.map((skill, index) => (
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

        {details.missingSkills.length > 0 && (
          <div className="mb-3">
            <h4 className="text-sm font-medium mb-2">Missing Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {details.missingSkills.map((skill, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200"
                >
                  <Zap className="h-3 w-3 mr-1" />
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
                    {Math.round(details.componentScores.skillScore)}%
                  </span>
                </div>
                <CustomProgress
                  value={details.componentScores.skillScore}
                  className="h-1.5 bg-muted/30"
                  indicatorClassName="bg-blue-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Experience (20%)</span>
                  <span className="font-medium">
                    {Math.round(details.componentScores.experienceScore)}%
                  </span>
                </div>
                <CustomProgress
                  value={details.componentScores.experienceScore}
                  className="h-1.5 bg-muted/30"
                  indicatorClassName="bg-green-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Education (10%)</span>
                  <span className="font-medium">
                    {Math.round(details.componentScores.educationScore)}%
                  </span>
                </div>
                <CustomProgress
                  value={details.componentScores.educationScore}
                  className="h-1.5 bg-muted/30"
                  indicatorClassName="bg-amber-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Job Title (20%)</span>
                  <span className="font-medium">
                    {Math.round(details.componentScores.jobTitleScore)}%
                  </span>
                </div>
                <CustomProgress
                  value={details.componentScores.jobTitleScore}
                  className="h-1.5 bg-muted/30"
                  indicatorClassName="bg-purple-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Certifications (10%)</span>
                  <span className="font-medium">
                    {Math.round(details.componentScores.certScore)}%
                  </span>
                </div>
                <CustomProgress
                  value={details.componentScores.certScore}
                  className="h-1.5 bg-muted/30"
                  indicatorClassName="bg-indigo-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Feedback</h4>
              <div className="text-xs text-muted-foreground bg-muted/10 p-3 rounded border">
                {details.feedback}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
