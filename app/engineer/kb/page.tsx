import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { listKnowledgeBase } from "@/app/actions/sdwan";
import { Badge } from "@/components/ui/badge";

export default async function EngineerKbPage() {
  const items = await listKnowledgeBase();

  return (
    <div className="space-y-2.5 pb-2">
      <div>
        <h1 className="text-lg font-semibold tracking-tight leading-snug">
          Knowledge Base
        </h1>
        <p className="text-xs leading-snug text-muted-foreground">
          SOP &amp; panduan lapangan · {items.length} artikel
        </p>
      </div>
      <ul className="divide-y overflow-hidden rounded-lg border bg-card">
        {items.map((kb) => (
          <li key={kb.id}>
            <Link
              href={`/engineer/kb/${kb.id}`}
              className="flex min-h-10 items-center gap-2 px-3 py-2 hover:bg-muted/50"
            >
              <Badge
                variant={kb.category === "SDWAN" ? "default" : "secondary"}
                className="shrink-0 px-1.5 py-0 text-[10px] font-medium leading-snug"
              >
                {kb.category}
              </Badge>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-snug">
                {kb.title}
              </span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-muted-foreground">
            Belum ada artikel
          </li>
        )}
      </ul>
    </div>
  );
}
