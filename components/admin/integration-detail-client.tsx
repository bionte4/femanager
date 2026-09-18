"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  resendWebhook,
  testIntegrationWebhook,
  toggleIntegration,
  updateIntegrationWebhook,
} from "@/app/actions/integrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

type Detail = {
  id: string;
  customer_name: string;
  api_key_masked: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  external_tickets: {
    id: string;
    external_ticket_id: string;
    internal_ticket_id: string;
    internal_ticket_no: string;
    status: string;
    created_at: string;
    last_response_ok: boolean | null;
    last_response_status: number | null;
    last_event: string | null;
  }[];
};

export function IntegrationDetailClient({ detail }: { detail: Detail }) {
  const router = useRouter();
  const [webhookUrl, setWebhookUrl] = useState(detail.webhook_url ?? "");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  async function handleToggle() {
    setBusy("toggle");
    const result = await toggleIntegration(detail.id, !detail.is_active);
    setBusy(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(detail.is_active ? "Dinonaktifkan" : "Diaktifkan");
    router.refresh();
  }

  async function handleSaveWebhook() {
    setBusy("save");
    const result = await updateIntegrationWebhook(detail.id, {
      webhook_url: webhookUrl,
      webhook_secret: webhookSecret || undefined,
    });
    setBusy(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Webhook diupdate");
    setWebhookSecret("");
    router.refresh();
  }

  async function handleTest() {
    setBusy("test");
    setTestResult(null);
    const result = await testIntegrationWebhook(detail.id);
    setBusy(null);
    if (!result.success) {
      toast.error(result.error);
      setTestResult(result.error);
      return;
    }
    toast.success(`Webhook OK (HTTP ${result.data?.status})`);
    setTestResult(`HTTP ${result.data?.status}\n${result.data?.body ?? ""}`);
  }

  async function handleResend(extId: string) {
    setBusy(extId);
    const result = await resendWebhook(extId);
    setBusy(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Webhook di-resend");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={detail.is_active ? "success" : "secondary"}>
          {detail.is_active ? "Active" : "Inactive"}
        </Badge>
        <Badge variant="outline">Key {detail.api_key_masked}</Badge>
        <Button
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={handleToggle}
        >
          {detail.is_active ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Webhook</CardTitle>
          <CardDescription>
            URL yang kami hit saat status ticket berubah. Signature: header{" "}
            <code>X-Webhook-Signature</code> (HMAC SHA256).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Webhook URL</Label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://webhook.site/..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Webhook secret (isi ulang untuk ganti)</Label>
            <Input
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder={detail.webhook_secret ?? "opsional"}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!!busy} onClick={handleSaveWebhook}>
              Simpan
            </Button>
            <Button
              variant="outline"
              disabled={!!busy || !webhookUrl}
              onClick={handleTest}
            >
              {busy === "test" ? "Testing..." : "Test Webhook"}
            </Button>
          </div>
          {testResult && (
            <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-3 text-xs">
              {testResult}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>External tickets</CardTitle>
          <CardDescription>Mapping ID customer ↔ ticket FE-Track</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.external_tickets.length === 0 ? (
            <EmptyState
              title="Belum ada ticket eksternal"
              description="Push dari Open API akan muncul di sini."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>External ID</TableHead>
                  <TableHead>Internal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Webhook</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.external_tickets.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-mono text-xs">
                      {e.external_ticket_id}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/tickets/${e.internal_ticket_id}`}
                        className="font-medium text-sky-700 hover:underline"
                      >
                        {e.internal_ticket_no}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{e.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {e.last_response_ok === true && (
                        <Badge variant="success">success</Badge>
                      )}
                      {e.last_response_ok === false && (
                        <Badge variant="destructive">failed</Badge>
                      )}
                      {e.last_response_ok === null && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {e.last_response_ok === false && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!!busy}
                          onClick={() => handleResend(e.id)}
                        >
                          Re-send
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
