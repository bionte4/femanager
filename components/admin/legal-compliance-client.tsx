"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  revokeEngineerAgreementAction,
  setActiveAgreementAction,
  upsertPartnershipAgreementAction,
} from "@/app/actions/legal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type Tab = "templates" | "agreements" | "compliance" | "audit";

type TemplateRow = {
  id: string;
  version: string;
  title: string;
  content_html: string;
  is_active: boolean;
  created_at: string;
  _count: { engineer_agreements: number };
};

type AgreementRow = {
  id: string;
  status: string;
  signed_at: string | null;
  signature_data: string | null;
  ip_address: string | null;
  consent_text: string;
  engineer: {
    id: string;
    full_name: string;
    phone: string;
    city: string | null;
    partnership_status: string;
  };
  agreement: { id: string; version: string; title: string };
};

type ComplianceDashboard = {
  kpi: {
    signed: number;
    notSigned: number;
    totalRejected: number;
    acceptRate: number;
  };
  recentLogs: Array<{
    id: string;
    type: string;
    engineer_id: string;
    engineer_name: string;
    ticket_id: string | null;
    ticket_no: string | null;
    metadata: unknown;
    created_at: string;
  }>;
  unsignedWithJobs: Array<{
    id: string;
    full_name: string;
    phone: string;
    partnership_status: string;
    _count: { assigned_tickets: number };
  }>;
};

export function LegalComplianceClient({
  templates,
  agreements,
  compliance,
}: {
  templates: TemplateRow[];
  agreements: AgreementRow[];
  compliance: ComplianceDashboard;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("templates");
  const [pending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [form, setForm] = useState({
    version: "",
    title: "",
    content_html: "",
  });
  const [sigPreview, setSigPreview] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [logType, setLogType] = useState("ALL");

  const filteredAgreements = useMemo(() => {
    return agreements.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (q) {
        const s = q.toLowerCase();
        if (
          !a.engineer.full_name.toLowerCase().includes(s) &&
          !a.engineer.phone.includes(s)
        )
          return false;
      }
      return true;
    });
  }, [agreements, statusFilter, q]);

  const filteredLogs = useMemo(() => {
    if (logType === "ALL") return compliance.recentLogs;
    return compliance.recentLogs.filter((l) => l.type === logType);
  }, [compliance.recentLogs, logType]);

  function openCreate() {
    setEditing(null);
    setForm({
      version: "v2.0",
      title: "Perjanjian Kemitraan Mitra Teknisi FE-Track",
      content_html: "<p>Isi perjanjian...</p>",
    });
    setEditOpen(true);
  }

  function openEdit(row: TemplateRow) {
    setEditing(row);
    setForm({
      version: row.version,
      title: row.title,
      content_html: row.content_html,
    });
    setEditOpen(true);
  }

  function saveTemplate() {
    startTransition(async () => {
      const res = await upsertPartnershipAgreementAction({
        id: editing?.id,
        ...form,
      });
      if (!res.success) toast.error(res.error);
      else {
        toast.success("Template disimpan");
        setEditOpen(false);
        router.refresh();
      }
    });
  }

  function setActive(id: string) {
    startTransition(async () => {
      const res = await setActiveAgreementAction(id);
      if (!res.success) toast.error(res.error);
      else {
        toast.success("Template diaktifkan");
        router.refresh();
      }
    });
  }

  function revoke(id: string) {
    if (!confirm("Revoke perjanjian mitra ini?")) return;
    startTransition(async () => {
      const res = await revokeEngineerAgreementAction(id);
      if (!res.success) toast.error(res.error);
      else {
        toast.success("Direvoke");
        router.refresh();
      }
    });
  }

  function exportComplianceCsv() {
    const rejects = compliance.recentLogs.filter(
      (l) => l.type === "JOB_REJECT"
    );
    const header = [
      "created_at",
      "engineer",
      "type",
      "ticket_no",
      "metadata",
    ];
    const lines = [
      header.join(","),
      ...rejects.map((l) =>
        [
          l.created_at,
          `"${l.engineer_name}"`,
          l.type,
          l.ticket_no ?? "",
          `"${JSON.stringify(l.metadata ?? {}).replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ];
    // Juga sertakan ringkasan bukti bebas menolak
    lines.push("");
    lines.push(
      `"RINGKASAN","Total JOB_REJECT=${compliance.kpi.totalRejected}","AcceptRate=${compliance.kpi.acceptRate}%","Bukti FE bebas menolak job = bukan karyawan"`
    );
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Compliance report diunduh");
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "templates", label: "Template Perjanjian" },
    { id: "agreements", label: "Perjanjian Mitra" },
    { id: "compliance", label: "Compliance" },
    { id: "audit", label: "Audit Trail" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "default" : "outline"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "templates" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={openCreate}>Tambah Template</Button>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signed</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm">
                      {t.version}
                    </TableCell>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>
                      {t.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell>{t._count.engineer_agreements}</TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(t)}
                      >
                        Edit
                      </Button>
                      {!t.is_active && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => setActive(t.id)}
                        >
                          Set Active
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {tab === "agreements" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Cari nama / HP"
              className="max-w-xs"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="rounded-md border px-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Semua status</option>
              <option value="PENDING">PENDING</option>
              <option value="SIGNED">SIGNED</option>
              <option value="REVOKED">REVOKED</option>
              <option value="EXPIRED">EXPIRED</option>
            </select>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Engineer</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signed at</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgreements.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="font-medium">{a.engineer.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.engineer.phone}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {a.agreement.version}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          a.status === "SIGNED" ? "success" : "secondary"
                        }
                      >
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {a.signed_at
                        ? new Date(a.signed_at).toLocaleString("id-ID")
                        : "—"}
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      {a.signature_data && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSigPreview(a.signature_data)}
                        >
                          Lihat TT
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" asChild>
                        <a
                          href={`/api/agreement/${a.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          PDF
                        </a>
                      </Button>
                      {a.status === "SIGNED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => revoke(a.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {tab === "compliance" && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Mitra Signed" value={String(compliance.kpi.signed)} />
            <Kpi
              label="Belum Signed"
              value={String(compliance.kpi.notSigned)}
            />
            <Kpi
              label="Total Job Ditolak"
              value={String(compliance.kpi.totalRejected)}
              hint="Bukti bebas menolak"
            />
            <Kpi
              label="Accept Rate"
              value={`${compliance.kpi.acceptRate}%`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-md border px-2 text-sm"
              value={logType}
              onChange={(e) => setLogType(e.target.value)}
            >
              <option value="ALL">Semua type</option>
              <option value="JOB_ACCEPT">JOB_ACCEPT</option>
              <option value="JOB_REJECT">JOB_REJECT</option>
              <option value="JOB_TIMEOUT">JOB_TIMEOUT</option>
              <option value="AGREEMENT_SIGNED">AGREEMENT_SIGNED</option>
            </select>
            <Button size="sm" variant="outline" onClick={exportComplianceCsv}>
              Export Compliance Report
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Engineer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(l.created_at).toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>{l.engineer_name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          l.type === "JOB_REJECT" ? "warning" : "outline"
                        }
                      >
                        {l.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {l.ticket_no ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                      {JSON.stringify(l.metadata ?? {})}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Engineer yang partnership_status ≠ SIGNED tapi sudah pernah ambil
            job. Idealnya 0.
          </p>
          {compliance.unsignedWithJobs.length === 0 ? (
            <EmptyState
              title="Audit bersih"
              description="Tidak ada FE unsigned yang mengambil job."
            />
          ) : (
            <div
              className={cn(
                "overflow-x-auto rounded-lg border border-red-300 bg-red-50"
              )}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Engineer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tickets</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compliance.unsignedWithJobs.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <p className="font-medium text-red-900">
                          {u.full_name}
                        </p>
                        <p className="text-xs">{u.phone}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {u.partnership_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{u._count.assigned_tickets}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Template" : "Tambah Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Version</Label>
              <Input
                value={form.version}
                onChange={(e) =>
                  setForm((f) => ({ ...f, version: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Content HTML</Label>
              <textarea
                className="min-h-[240px] w-full rounded-md border px-3 py-2 font-mono text-xs"
                value={form.content_html}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content_html: e.target.value }))
                }
              />
            </div>
            <Button className="w-full" disabled={pending} onClick={saveTemplate}>
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!sigPreview} onOpenChange={() => setSigPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tanda Tangan</DialogTitle>
          </DialogHeader>
          {sigPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sigPreview}
              alt="Signature"
              className="w-full rounded border bg-white"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold">{value}</p>
        {hint && (
          <p className="text-[10px] text-muted-foreground">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}
