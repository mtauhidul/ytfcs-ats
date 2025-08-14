import { Draggable } from "@hello-pangea/dnd";
import { GripHorizontalIcon, InfoIcon } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

// Local candidate type to match existing workflow structure
type WorkflowCandidate = {
  id: string;
  name: string;
  stageId: string;
  tags?: string[];
  rating?: number;
  updatedAt?: string;
  company?: string;
  position?: string;
  reviewers?: string[];
};

interface CandidateCardProps {
  candidate: WorkflowCandidate;
  index: number;
}

export function CandidateCard({ 
  candidate, 
  index 
}: CandidateCardProps) {
  // Rating component
  const RatingStars = ({ rating = 0 }: { rating?: number }) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <svg
            key={i}
            className="h-3 w-3 fill-amber-400 text-amber-400"
            viewBox="0 0 24 24"
          >
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <svg key={i} className="h-3 w-3" viewBox="0 0 24 24">
            <defs>
              <linearGradient id={`half-${i}`}>
                <stop offset="50%" className="fill-amber-400" />
                <stop offset="50%" className="fill-gray-300" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#half-${i})`}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        );
      } else {
        stars.push(
          <svg key={i} className="h-3 w-3 text-gray-300" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        );
      }
    }

    return <div className="flex gap-0.5">{stars}</div>;
  };

  // Group reviewers
  const getReviewerAvatars = (reviewers?: string[]) => {
    if (!reviewers || reviewers.length === 0) return null;

    const displayReviewers = reviewers.slice(0, 3);
    const remainingCount = reviewers.length - 3;

    return (
      <div className="flex -space-x-1">
        {displayReviewers.map((reviewer, index) => (
          <div
            key={reviewer}
            className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium"
            style={{ zIndex: 10 - index }}
          >
            {reviewer.charAt(0).toUpperCase()}
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium">
            +{remainingCount}
          </div>
        )}
      </div>
    );
  };

  return (
    <Draggable
      key={candidate.id}
      draggableId={candidate.id}
      index={index}
    >
      {(dragProvided, dragSnapshot) => (
        <div
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          {...dragProvided.dragHandleProps}
          className={cn(
            "bg-white rounded-md p-3 border",
            dragSnapshot.isDragging
              ? "shadow-lg ring-2 ring-primary/50"
              : "hover:border-primary/50"
          )}
          role="article"
          aria-label={`Candidate ${candidate.name}`}
          tabIndex={0}
        >
      {/* Candidate Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1">
            <GripHorizontalIcon className="size-3 opacity-40" />
            <h3 className="font-medium text-sm">
              {candidate.name}
            </h3>
          </div>

          {candidate.position && (
            <p className="text-xs text-muted-foreground">
              {candidate.position}
              {candidate.company &&
                ` at ${candidate.company}`}
            </p>
          )}
        </div>

        {getReviewerAvatars(candidate.reviewers)}
      </div>

      {/* Tags */}
      {candidate.tags &&
        candidate.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {candidate.tags
              .slice(0, 2)
              .map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="px-1.5 py-0 text-[10px] h-4"
                >
                  {tag}
                </Badge>
              ))}
            {candidate.tags.length > 2 && (
              <Badge
                variant="secondary"
                className="px-1.5 py-0 text-[10px] h-4"
              >
                +{candidate.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t">
        <RatingStars rating={candidate.rating} />

        {candidate.updatedAt && (
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <InfoIcon className="size-2.5" />
            {new Date(
              candidate.updatedAt
            ).toLocaleDateString()}
          </div>
        )}
      </div>
        </div>
      )}
    </Draggable>
  );
}
