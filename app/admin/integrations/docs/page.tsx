import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth, ADMIN_ROLES } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function IntegrationDocsPage() {
  const session = await auth();
  if (!session?.user || !(ADMIN_ROLES as readonly string[]).includes(session.user.role)) {
    redirect("/login");
  }

  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const apiBase = `${base}/api/v1/external`;

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/admin/integrations">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight">
          Dokumentasi API untuk Customer
        </h1>
        <p className="text-xs text-muted-foreground">
          Open API FE-Track — push ticket dari ITSM customer & terima webhook status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Base URL & Auth</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Base URL: <code className="rounded bg-muted px-1">{apiBase}</code>
          </p>
          <p>
            Auth header: <code className="rounded bg-muted px-1">X-API-KEY: &lt;api_key&gt;</code>
          </p>
          <p>Rate limit: 60 request / menit per API key. CORS enabled.</p>
        </CardContent>
      </Card>

      <DocBlock
        title="1. POST /tickets — Buat ticket"
        code={`curl -X POST ${apiBase}/tickets \\
  -H "X-API-KEY: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "external_ticket_id": "INC-BRI-001",
    "tenant_code": "BRI-JKT-001",
    "device_serial": null,
    "type": "INCIDENT",
    "priority": "high",
    "description": "EDC tidak bisa print",
    "reported_by": "NOC BRI"
  }'`}
      />

      <DocBlock
        title="2. GET /tickets/:externalId — Detail + timeline"
        code={`curl ${apiBase}/tickets/INC-BRI-001 \\
  -H "X-API-KEY: YOUR_API_KEY"`}
      />

      <DocBlock
        title="3. PATCH /tickets/:externalId — Close / cancel"
        code={`curl -X PATCH ${apiBase}/tickets/INC-BRI-001 \\
  -H "X-API-KEY: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{ "status": "closed", "notes": "Selesai di sisi customer" }'`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Webhook (kami → customer)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Setiap perubahan status ticket, kami POST ke{" "}
            <code>webhook_url</code> dengan header:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <code>X-Webhook-Signature</code> — HMAC SHA256 hex dari body JSON
              (pakai <code>webhook_secret</code>)
            </li>
            <li>
              <code>X-FETrack-Event</code> — nama event
            </li>
          </ul>
          <p>Events: ticket.assigned, on_the_way, on_site, in_progress, resolved, closed, escalated</p>
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{`{
  "event": "ticket.assigned",
  "timestamp": "2026-09-18T04:00:00.000Z",
  "data": {
    "external_ticket_id": "INC-BRI-001",
    "internal_ticket_no": "FE-20260918-0001",
    "status": "ASSIGNED",
    "tenant_code": "BRI-JKT-001",
    "engineer": { "name": "Budi Santoso", "phone": "081222222001" },
    "notes": "Auto-dispatch ke Budi Santoso (1200m)",
    "photos": [],
    "lat": null,
    "lng": null,
    "resolved_at": null
  }
}`}</pre>
          <p className="font-medium">Validasi signature (Node.js):</p>
          <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{`const crypto = require("crypto");
const sig = req.headers["x-webhook-signature"];
const expected = crypto
  .createHmac("sha256", WEBHOOK_SECRET)
  .update(rawBody)
  .digest("hex");
if (sig !== expected) throw new Error("invalid signature");`}</pre>
        </CardContent>
      </Card>
    </div>
  );
}

function DocBlock({ title, code }: { title: string; code: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
          {code}
        </pre>
      </CardContent>
    </Card>
  );
}
