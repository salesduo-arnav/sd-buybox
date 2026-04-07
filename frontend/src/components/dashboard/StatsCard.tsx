import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/Utils";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  valueClassName?: string;
  onClick?: () => void;
}

export function StatsCard({ title, value, icon: Icon, description, valueClassName, onClick }: StatsCardProps) {
  return (
    <Card
      className={cn(
        "rounded-xl border border-gray-200/80 bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow duration-200",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-3xl font-bold mt-1", valueClassName)}>{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
