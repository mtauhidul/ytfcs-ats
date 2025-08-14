import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

export function WorkflowLoadingState() {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-[600px]">
            <CardHeader className="flex-row items-center justify-between p-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-12" />
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-28 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
