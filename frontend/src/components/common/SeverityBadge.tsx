import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/Utils";

const severityStyles: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
};

interface SeverityBadgeProps {
  severity: string;
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("text-xs capitalize", severityStyles[severity])}
    >
      {severity}
    </Badge>
  );
}
