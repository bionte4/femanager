import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KbArticleBody } from "@/components/kb/kb-article-body";

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
    <div className="space-y-2.5 pb-2">
      <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 px-2 text-xs">
        <Link href="/engineer/kb">
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali
        </Link>
      </Button>
      <div className="space-y-1">
        <Badge className="px-1.5 py-0 text-[10px] font-medium leading-snug">
          {kb.category}
        </Badge>
        <h1 className="text-lg font-semibold leading-snug tracking-tight">
          {kb.title}
        </h1>
      </div>
      <article className="rounded-lg border bg-card px-3 py-2.5">
        <KbArticleBody content={kb.content} />
      </article>
      {(kb.video_url || kb.file_url) && (
        <div className="flex flex-col gap-1.5">
          {kb.video_url && (
            <a
              href={kb.video_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Video className="h-3.5 w-3.5" />
              Tonton video
            </a>
          )}
          {kb.file_url && (
            <a
              href={kb.file_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              Download PDF SOP
            </a>
          )}
        </div>
      )}
    </div>
  );
}
