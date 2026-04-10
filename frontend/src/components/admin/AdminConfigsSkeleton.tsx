import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminConfigsSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-64 mt-1" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[1, 2].map((j) => (
              <div key={j} className="space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-10 w-full max-w-xs" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
