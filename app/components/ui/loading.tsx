import { Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "minimal" | "with-text" | "overlay";
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6", 
  lg: "h-8 w-8",
  xl: "h-12 w-12"
};

export function LoadingSpinner({ 
  size = "md", 
  variant = "default", 
  text = "Loading...",
  className 
}: LoadingSpinnerProps) {
  const spinnerSize = sizeClasses[size];

  if (variant === "minimal") {
    return (
      <Loader2 className={cn("animate-spin text-muted-foreground", spinnerSize, className)} />
    );
  }

  if (variant === "overlay") {
    return (
      <div className={cn("fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center", className)}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className={cn("animate-spin text-primary", spinnerSize)} />
          {text && (
            <p className="text-sm font-medium text-muted-foreground">{text}</p>
          )}
        </div>
      </div>
    );
  }

  if (variant === "with-text") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className={cn("animate-spin text-muted-foreground", spinnerSize)} />
        <span className="text-sm text-muted-foreground">{text}</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center py-8", className)}>
      <Loader2 className={cn("animate-spin text-primary mb-2", spinnerSize)} />
      {text && (
        <p className="text-sm font-medium text-muted-foreground">{text}</p>
      )}
    </div>
  );
}

interface DataLoaderProps {
  loading: boolean;
  data: any[];
  error?: string | null;
  children: React.ReactNode;
  emptyState?: React.ReactNode;
  loadingText?: string;
  className?: string;
}

export function DataLoader({
  loading,
  data,
  error,
  children,
  emptyState,
  loadingText = "Loading data...",
  className
}: DataLoaderProps) {
  if (loading && data.length === 0) {
    return (
      <div className={cn("min-h-[200px] flex items-center justify-center", className)}>
        <LoadingSpinner text={loadingText} />
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div className={cn("min-h-[200px] flex items-center justify-center", className)}>
        <div className="text-center">
          <p className="text-sm text-destructive mb-2">Error loading data</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!loading && data.length === 0) {
    return emptyState || (
      <div className={cn("min-h-[200px] flex items-center justify-center", className)}>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No data available</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface PageLoaderProps {
  loading: boolean;
  hasData: boolean;
  text?: string;
  children: React.ReactNode;
}

export function PageLoader({ loading, hasData, text = "Loading...", children }: PageLoaderProps) {
  if (loading && !hasData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text={text} />
      </div>
    );
  }

  return <>{children}</>;
}

interface InlineLoaderProps {
  loading: boolean;
  size?: "sm" | "md";
  text?: string;
  className?: string;
}

export function InlineLoader({ loading, size = "sm", text, className }: InlineLoaderProps) {
  if (!loading) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

export function TableLoader({ loading, rows = 5 }: { loading: boolean; rows?: number }) {
  if (!loading) return null;

  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <div className="h-4 bg-muted rounded animate-pulse flex-1" />
          <div className="h-4 bg-muted rounded animate-pulse w-24" />
          <div className="h-4 bg-muted rounded animate-pulse w-16" />
        </div>
      ))}
    </div>
  );
}

export function CardLoader({ loading, cards = 3 }: { loading: boolean; cards?: number }) {
  if (!loading) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
          <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
        </div>
      ))}
    </div>
  );
}
