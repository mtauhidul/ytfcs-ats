import { LayersIcon } from "lucide-react";
import { Button } from "~/components/ui/button";

export function EmptyStagesState() {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] p-6">
      <div className="bg-muted/50 p-4 rounded-full mb-4">
        <LayersIcon className="size-10 text-muted-foreground/50" />
      </div>
      <h2 className="text-xl font-medium mb-2">No stages defined</h2>
      <p className="text-muted-foreground text-center max-w-md mb-6">
        You need to define stages in your hiring pipeline before you can
        visualize your workflow.
      </p>
      <Button asChild>
        <a href="/dashboard/stages">Go to Stages Configuration</a>
      </Button>
    </div>
  );
}
