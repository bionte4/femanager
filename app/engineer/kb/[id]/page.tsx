import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type PageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function EngineerKbDetailPage({ params }: PageProps) {
  const { id } = await Promise.resolve(params);
  const kb = await prisma.knowledgeBase.findFirst({
    where: { id, is_active: true },
  });
  if (!kb) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-4 pb-24">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/engineer/kb">
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
      </Button>
      <Badge>{kb.category}</Badge>
      <h1 className="text-2xl font-bold">{kb.title}</h1>
      <article className="whitespace-pre-wrap rounded-xl border bg-card p-4 text-sm leading-relaxed">
        {kb.content}
      </article>
      {kb.video_url && (
        <a
          href={kb.video_url}
          target="_blank"
          rel="noreferrer"
          className="block text-sm text-primary underline"
        >
          Tonton video YouTube →
        </a>
      )}
      {kb.file_url && (
        <a
          href={kb.file_url}
          target="_blank"
          rel="noreferrer"
          className="block text-sm text-primary underline"
        >
          Download PDF SOP →
        </a>
      )}
    </div>
  );
}
