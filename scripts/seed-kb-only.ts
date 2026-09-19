/**
 * Seed / refresh Knowledge Base saja (sama sumber dengan local full seed).
 *
 *   npx tsx scripts/seed-kb-only.ts
 */
import { PrismaClient } from "@prisma/client";
import { KNOWLEDGE_BASE_SEED } from "../prisma/seed-knowledge-base";

const prisma = new PrismaClient();

async function main() {
  let created = 0;
  let updated = 0;

  for (const kb of KNOWLEDGE_BASE_SEED) {
    const existing = await prisma.knowledgeBase.findFirst({
      where: { title: kb.title },
    });
    if (!existing) {
      await prisma.knowledgeBase.create({
        data: {
          title: kb.title,
          category: kb.category,
          content: kb.content,
          video_url: kb.video_url ?? null,
          file_url: kb.file_url ?? null,
          is_active: true,
        },
      });
      created += 1;
    } else {
      await prisma.knowledgeBase.update({
        where: { id: existing.id },
        data: {
          category: kb.category,
          content: kb.content,
          video_url: kb.video_url ?? null,
          file_url: kb.file_url ?? existing.file_url,
          is_active: true,
        },
      });
      updated += 1;
    }
  }

  const total = await prisma.knowledgeBase.count({ where: { is_active: true } });
  console.log("KB seed OK:", { created, updated, catalog: KNOWLEDGE_BASE_SEED.length, active_in_db: total });
  const byCat = await prisma.knowledgeBase.groupBy({
    by: ["category"],
    where: { is_active: true },
    _count: true,
  });
  console.log(
    "Per kategori:",
    byCat.map((c) => `${c.category}:${c._count}`).join(", ")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
