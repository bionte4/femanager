"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Eye, Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { createIntegration } from "@/app/actions/integrations";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Row = {
  id: string;
  customer_name: string;
  api_key_masked: string;
  webhook_url: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  external_tickets_count: number;
};

export function IntegrationsTable({ items }: { items: Row[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    webhook_url: "",
    webhook_secret: "",
  });

  async function handleCreate() {
    setSaving(true);
    const result = await createIntegration(form);
    setSaving(false);
    if (!result.success || !result.data) {
      toast.error(result.success === false ? result.error : "Gagal");
      return;
    }
    setCreatedKey(result.data.api_key);
    setCreatedId(result.data.id);
    setOpen(false);
    toast.success("Integration dibuat — copy API key sekarang");
    router.refresh();
  }

  function copyKey() {
    if (!createdKey) return;
    void navigator.clipboard.writeText(createdKey);
    toast.success("API key disalin");
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <Button variant="outline" asChild>
          <Link href="/admin/integrations/docs">
            <BookOpen className="h-4 w-4" />
            Dokumentasi API
          </Link>
        </Button>
        <Button
          onClick={() => {
            setForm({ customer_name: "", webhook_url: "", webhook_secret: "" });
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Create Integration
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Belum ada integration"
          description="Buat API key untuk customer ITSM (GLPI/ServiceNow)."
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Webhook</TableHead>
                <TableHead>Tickets</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.customer_name}</TableCell>
                  <TableCell className="font-mono text-xs">{i.api_key_masked}</TableCell>
                  <TableCell className="max-w-[180px] truncate text-xs">
                    {i.webhook_url ?? "—"}
                  </TableCell>
                  <TableCell>{i.external_tickets_count}</TableCell>
                  <TableCell>
                    <Badge variant={i.is_active ? "success" : "secondary"}>
                      {i.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {i.last_used_at
                      ? new Date(i.last_used_at).toLocaleString("id-ID")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/integrations/${i.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Integration</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Customer name</Label>
              <Input
                value={form.customer_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, customer_name: e.target.value }))
                }
                placeholder="Bank BRI"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Webhook URL (opsional)</Label>
              <Input
                value={form.webhook_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, webhook_url: e.target.value }))
                }
                placeholder="https://customer.com/api/webhook/fetrack"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Webhook secret (opsional)</Label>
              <Input
                value={form.webhook_secret}
                onChange={(e) =>
                  setForm((f) => ({ ...f, webhook_secret: e.target.value }))
                }
                placeholder="untuk sign X-Webhook-Signature"
              />
            </div>
            <Button className="w-full" disabled={saving} onClick={handleCreate}>
              {saving ? "Membuat..." : "Generate API Key"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>COPY API KEY INI SEKARANG</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-amber-700">
            Key ini tidak akan ditampilkan full lagi setelah modal ditutup.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted p-3">
            <code className="flex-1 break-all text-sm">{createdKey}</code>
            <Button size="icon" variant="outline" onClick={copyKey}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
{`curl -X POST ${baseUrl}/api/v1/external/tickets \\
  -H "X-API-KEY: ${createdKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "external_ticket_id": "INC-001",
    "tenant_code": "BRI-JKT-001",
    "description": "EDC tidak bisa print",
    "priority": "high"
  }'`}
          </pre>
          {createdId && (
            <Button asChild>
              <Link href={`/admin/integrations/${createdId}`}>Buka detail</Link>
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
