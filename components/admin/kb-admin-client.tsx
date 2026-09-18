"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteKnowledgeBaseAction,
  upsertKnowledgeBaseAction,
} from "@/app/actions/sdwan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Kb = {
  id: string;
  title: string;
  category: string;
  content: string;
  video_url: string | null;
  file_url: string | null;
  is_active: boolean;
};

export function KbAdminClient({ items }: { items: Kb[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    category: "SDWAN",
    content: "",
    video_url: "",
    file_url: "",
  });
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const res = await upsertKnowledgeBaseAction(form);
    setBusy(false);
    if (!res.success) toast.error(res.error);
    else {
      toast.success("KB dibuat");
      setForm({ title: "", category: "SDWAN", content: "", video_url: "", file_url: "" });
      router.refresh();
    }
  }

  async function remove(id: string) {
    const res = await deleteKnowledgeBaseAction(id);
    if (!res.success) toast.error(res.error);
    else {
      toast.success("Dihapus");
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah Artikel KB</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="space-y-1">
            <Label>Judul</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Kategori</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EDC">EDC</SelectItem>
                <SelectItem value="SDWAN">SDWAN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Konten (markdown)</Label>
            <textarea
              className="min-h-[120px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>YouTube URL</Label>
              <Input
                value={form.video_url}
                onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>PDF SOP URL</Label>
              <Input
                value={form.file_url}
                onChange={(e) => setForm((f) => ({ ...f, file_url: e.target.value }))}
              />
            </div>
          </div>
          <Button disabled={busy || !form.title || !form.content} onClick={() => void create()}>
            Simpan
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {items.map((kb) => (
          <Card key={kb.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{kb.title}</CardTitle>
                <Badge className="mt-1" variant="outline">
                  {kb.category}
                </Badge>
              </div>
              <Button size="sm" variant="destructive" onClick={() => void remove(kb.id)}>
                Hapus
              </Button>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {kb.content}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
