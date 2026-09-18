"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, FileText, Plus, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import {
  deleteKnowledgeBaseAction,
  upsertKnowledgeBaseAction,
} from "@/app/actions/sdwan";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KbArticleBody } from "@/components/kb/kb-article-body";
import { KbChatWidget } from "@/components/kb/kb-chat-widget";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "EDC",
  "SDWAN",
  "LAN",
  "WAN",
  "WIFI",
  "CCTV",
  "PRINTER",
  "GENERAL",
] as const;

type Kb = {
  id: string;
  title: string;
  category: string;
  content: string;
  video_url: string | null;
  file_url: string | null;
  is_active: boolean;
};

/** Preview 1 baris untuk tabel — strip heading markdown */
function previewText(content: string): string {
  return content
    .replace(/^#+\s*/gm, "")
    .replace(/\n+/g, " ")
    .trim();
}

export function KbAdminClient({ items }: { items: Kb[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<string>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [viewing, setViewing] = useState<Kb | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "EDC",
    content: "",
    video_url: "",
    file_url: "",
  });

  // Deep-link dari chatbot admin: ?highlight=<id>
  useEffect(() => {
    const id = searchParams.get("highlight");
    if (!id) return;
    const found = items.find((k) => k.id === id);
    if (found) setViewing(found);
  }, [searchParams, items]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const kb of items) {
      map.set(kb.category, (map.get(kb.category) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === "ALL") return items;
    return items.filter((k) => k.category === filter);
  }, [items, filter]);

  async function create() {
    setBusy(true);
    const res = await upsertKnowledgeBaseAction(form);
    setBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    toast.success("KB dibuat");
    setForm({
      title: "",
      category: "EDC",
      content: "",
      video_url: "",
      file_url: "",
    });
    setCreateOpen(false);
    router.refresh();
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Hapus "${title}"?`)) return;
    const res = await deleteKnowledgeBaseAction(id);
    if (!res.success) toast.error(res.error);
    else {
      toast.success("Dihapus");
      router.refresh();
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-medium leading-snug transition-colors",
              filter === "ALL"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            Semua ({items.length})
          </button>
          {CATEGORIES.map((cat) => {
            const n = counts.get(cat) ?? 0;
            if (n === 0 && filter !== cat) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-medium leading-snug transition-colors",
                  filter === cat
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {cat} ({n})
              </button>
            );
          })}
        </div>
        <Button size="sm" className="h-8 shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Tambah
        </Button>
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">
        Klik judul atau ikon mata untuk baca isi SOP. Atau uji chatbot di bawah.
      </p>

      <div className="rounded-lg border bg-card p-2.5">
        <p className="mb-2 text-[12px] font-medium leading-snug">Uji Tanya SOP</p>
        <KbChatWidget audience="admin" embedded />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada artikel"
          description={
            filter === "ALL"
              ? "Tambah SOP untuk engineer lapangan."
              : `Belum ada artikel kategori ${filter}.`
          }
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Tambah artikel
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 w-[38%] text-xs">Judul</TableHead>
                <TableHead className="h-9 w-24 text-xs">Kategori</TableHead>
                <TableHead className="h-9 text-xs">Preview</TableHead>
                <TableHead className="h-9 w-16 text-xs">Link</TableHead>
                <TableHead className="h-9 w-20 text-xs">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((kb) => (
                <TableRow key={kb.id} className="align-middle">
                  <TableCell className="py-2">
                    <button
                      type="button"
                      onClick={() => setViewing(kb)}
                      className="text-left text-[13px] font-medium leading-snug hover:underline"
                    >
                      {kb.title}
                    </button>
                    {!kb.is_active && (
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        Nonaktif
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-medium">
                      {kb.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <button
                      type="button"
                      onClick={() => setViewing(kb)}
                      className="line-clamp-1 w-full text-left text-xs leading-snug text-muted-foreground hover:text-foreground"
                    >
                      {previewText(kb.content) || "(kosong)"}
                    </button>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-0.5">
                      {kb.video_url ? (
                        <a
                          href={kb.video_url}
                          target="_blank"
                          rel="noreferrer"
                          title="Video"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Video className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                      {kb.file_url ? (
                        <a
                          href={kb.file_url}
                          target="_blank"
                          rel="noreferrer"
                          title="PDF"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <FileText className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                      {!kb.video_url && !kb.file_url && (
                        <span className="px-1 text-[10px] text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Baca isi"
                        onClick={() => setViewing(kb)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Hapus"
                        onClick={() => void remove(kb.id, kb.title)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Baca isi lengkap */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-2 overflow-hidden">
          <DialogHeader className="shrink-0 space-y-1.5">
            {viewing && (
              <Badge variant="outline" className="w-fit px-1.5 py-0 text-[10px]">
                {viewing.category}
              </Badge>
            )}
            <DialogTitle className="text-base leading-snug">
              {viewing?.title}
            </DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <KbArticleBody content={viewing.content} />
              {(viewing.video_url || viewing.file_url) && (
                <div className="mt-3 flex flex-col gap-1.5 border-t pt-2.5">
                  {viewing.video_url && (
                    <a
                      href={viewing.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Tonton video
                    </a>
                  )}
                  {viewing.file_url && (
                    <a
                      href={viewing.file_url}
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
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg gap-3">
          <DialogHeader>
            <DialogTitle className="text-base">Tambah Artikel KB</DialogTitle>
          </DialogHeader>
          <div className="grid gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs">Judul</Label>
              <Input
                className="h-8 text-sm"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kategori</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Konten (markdown)</Label>
              <textarea
                className="min-h-[140px] w-full rounded-md border bg-background px-2.5 py-2 text-sm leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">YouTube URL</Label>
                <Input
                  className="h-8 text-sm"
                  value={form.video_url}
                  onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">PDF SOP URL</Label>
                <Input
                  className="h-8 text-sm"
                  value={form.file_url}
                  onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))}
                />
              </div>
            </div>
            <Button
              size="sm"
              className="h-8"
              disabled={busy || !form.title || !form.content}
              onClick={() => void create()}
            >
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
