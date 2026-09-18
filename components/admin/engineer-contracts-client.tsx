"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  activateContractAction,
  createEngineerContractAction,
  endContractAction,
  extendContractAction,
  suspendContractAction,
  switchEngagementAction,
} from "@/app/actions/contracts";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ContractRow = {
  id: string;
  type: string;
  status: string;
  start_at: Date | string;
  end_at: Date | string;
  client_label: string | null;
  placement_cities: string[];
  document_url: string | null;
  notes: string | null;
};

type ChangeLog = {
  id: string;
  from_type: string;
  to_type: string;
  reason: string | null;
  created_at: Date | string;
};

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusVariant(
  status: string
): "success" | "secondary" | "warning" | "destructive" | "outline" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "DRAFT":
      return "secondary";
    case "SUSPENDED":
      return "warning";
    case "EXPIRED":
    case "ENDED":
      return "destructive";
    default:
      return "outline";
  }
}

export function EngineerContractsClient({
  engineerId,
  engineerName,
  engagementType,
  employmentStatus,
  isSuperAdmin,
  contracts,
  changeLogs,
}: {
  engineerId: string;
  engineerName: string;
  engagementType: string;
  employmentStatus: string;
  isSuperAdmin: boolean;
  contracts: ContractRow[];
  changeLogs: ChangeLog[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState("PKWT_OUTTASK");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [clientLabel, setClientLabel] = useState("");
  const [cities, setCities] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [activateNow, setActivateNow] = useState(true);
  const [extendId, setExtendId] = useState<string | null>(null);
  const [extendDate, setExtendDate] = useState("");
  const [switchTo, setSwitchTo] = useState("PKWT_OUTTASK");
  const [switchReason, setSwitchReason] = useState("");

  async function create() {
    setBusy(true);
    const res = await createEngineerContractAction({
      user_id: engineerId,
      type: type as "PKWT_OUTTASK" | "PKWT_INTERNAL",
      start_at: startAt,
      end_at: endAt,
      client_label: clientLabel || undefined,
      placement_cities: cities || undefined,
      document_url: docUrl || undefined,
      notes: notes || undefined,
      activate_now: activateNow,
    });
    setBusy(false);
    if (!res.success) toast.error(res.error);
    else {
      toast.success("Kontrak dibuat");
      setStartAt("");
      setEndAt("");
      setClientLabel("");
      setCities("");
      setDocUrl("");
      setNotes("");
      router.refresh();
    }
  }

  async function run(
    fn: () => Promise<{ success: boolean; error?: string }>,
    okMsg: string
  ) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.success) toast.error(res.error);
    else {
      toast.success(okMsg);
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          Kontrak PKWT — {engineerName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Engagement: <span className="font-medium">{engagementType}</span> ·
          Employment: <span className="font-medium">{employmentStatus}</span>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buat kontrak</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Tipe</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PKWT_OUTTASK">PKWT Outtask</SelectItem>
                <SelectItem value="PKWT_INTERNAL">PKWT Internal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Client penempatan</Label>
            <Input
              value={clientLabel}
              onChange={(e) => setClientLabel(e.target.value)}
              placeholder="Bank X / Vendor Y"
            />
          </div>
          <div className="space-y-1">
            <Label>Mulai</Label>
            <Input
              type="date"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Berakhir</Label>
            <Input
              type="date"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Kota penempatan (pisah koma)</Label>
            <Input
              value={cities}
              onChange={(e) => setCities(e.target.value)}
              placeholder="Jakarta Selatan, Depok"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>URL dokumen PDF (opsional)</Label>
            <Input
              value={docUrl}
              onChange={(e) => setDocUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Catatan</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={activateNow}
              onChange={(e) => setActivateNow(e.target.checked)}
              className="h-4 w-4"
            />
            Aktifkan langsung (set engagement PKWT + employment ACTIVE)
          </label>
          <Button
            className="sm:col-span-2"
            disabled={busy || !startAt || !endAt}
            onClick={() => void create()}
          >
            Simpan kontrak
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar kontrak</CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada kontrak.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Client / Kota</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{c.type}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {fmtDate(c.start_at)} – {fmtDate(c.end_at)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{c.client_label ?? "—"}</div>
                      <div className="text-muted-foreground">
                        {c.placement_cities.length
                          ? c.placement_cities.join(", ")
                          : "Semua kota"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(c.status === "DRAFT" || c.status === "SUSPENDED") && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              void run(
                                () => activateContractAction(c.id),
                                "Kontrak aktif"
                              )
                            }
                          >
                            Aktifkan
                          </Button>
                        )}
                        {c.status === "ACTIVE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              void run(
                                () => suspendContractAction(c.id),
                                "Disuspend"
                              )
                            }
                          >
                            Suspend
                          </Button>
                        )}
                        {c.status !== "ENDED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() =>
                              void run(
                                () => endContractAction(c.id),
                                "Kontrak diakhiri"
                              )
                            }
                          >
                            End
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => {
                            setExtendId(c.id);
                            setExtendDate(
                              new Date(c.end_at).toISOString().slice(0, 10)
                            );
                          }}
                        >
                          Extend
                        </Button>
                      </div>
                      {extendId === c.id && (
                        <div className="mt-2 flex gap-1">
                          <Input
                            type="date"
                            value={extendDate}
                            onChange={(e) => setExtendDate(e.target.value)}
                            className="h-8"
                          />
                          <Button
                            size="sm"
                            disabled={busy || !extendDate}
                            onClick={() =>
                              void run(async () => {
                                const r = await extendContractAction({
                                  contract_id: c.id,
                                  end_at: extendDate,
                                });
                                if (r.success) setExtendId(null);
                                return r;
                              }, "Extended")
                            }
                          >
                            OK
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Switch engagement</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Ke tipe</Label>
              <Select value={switchTo} onValueChange={setSwitchTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MITRA">Mitra</SelectItem>
                  <SelectItem value="PKWT_OUTTASK">PKWT Outtask</SelectItem>
                  <SelectItem value="PKWT_INTERNAL">PKWT Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Alasan (wajib)</Label>
              <Input
                value={switchReason}
                onChange={(e) => setSwitchReason(e.target.value)}
                placeholder="Mis. Hire PKWT outtask client Bank X"
              />
            </div>
            <Button
              className="sm:col-span-2"
              variant="secondary"
              disabled={busy || switchReason.length < 3}
              onClick={() =>
                void run(
                  () =>
                    switchEngagementAction({
                      user_id: engineerId,
                      to_type: switchTo as
                        | "MITRA"
                        | "PKWT_OUTTASK"
                        | "PKWT_INTERNAL",
                      reason: switchReason,
                    }),
                  "Engagement diganti"
                )
              }
            >
              Simpan switch
            </Button>
          </CardContent>
        </Card>
      )}

      {changeLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Riwayat ganti engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {changeLogs.map((l) => (
                <li key={l.id} className="border-b border-border pb-2 last:border-0">
                  <span className="font-medium">
                    {l.from_type} → {l.to_type}
                  </span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {fmtDate(l.created_at)}
                  </span>
                  {l.reason && (
                    <p className="text-xs text-muted-foreground">{l.reason}</p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
