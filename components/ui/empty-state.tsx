import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
};

export function EmptyState({
  title,
  description,
  className,
  action,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center",
        className
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
        <Inbox className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {description && (
        <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}
