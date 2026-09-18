import Link from "next/link";
import { listKnowledgeBase } from "@/app/actions/sdwan";
import { Badge } from "@/components/ui/badge";

export default async function EngineerKbPage() {
  const items = await listKnowledgeBase();

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-24">
      <div>
        <h1 className="text-xl font-semibold">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">SOP &amp; panduan lapangan</p>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {items.map((kb) => (
          <li key={kb.id}>
            <Link
              href={`/engineer/kb/${kb.id}`}
              className="block px-4 py-3 hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <Badge variant={kb.category === "SDWAN" ? "default" : "secondary"}>
                  {kb.category}
                </Badge>
                <span className="font-medium">{kb.title}</span>
              </div>
            </Link>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            Belum ada artikel
          </li>
        )}
      </ul>
    </div>
  );
}
