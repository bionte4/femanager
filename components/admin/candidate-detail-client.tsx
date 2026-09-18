"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CandidateStatus } from "@prisma/client";
import {
  approveCandidateAction,
  blacklistCandidateAction,
  screeningAction,
  trainingAction,
} from "@/app/actions/recruitment";
import { MapPicker } from "@/components/map/map-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CandidateDetail = {
  id: string;
  full_name: string;
  phone: string;
  whatsapp: string;
  email: string | null;
  nik: string | null;
  address: string;
  province: string;
  city: string;
  district: string;
  lat: number | null;
  lng: number | null;
  education: string;
  school_name: string | null;
  has_motorcycle: boolean;
  has_toolkit: boolean;
  has_laptop: boolean;
  has_car?: boolean;
  has_ladder?: boolean;
  has_drill?: boolean;
  skills: string[];
  experience_years: number;
  previous_vendor: string | null;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_account_name: string | null;
  id_card_photo_url: string | null;
  selfie_photo_url: string | null;
  status: CandidateStatus;
  screening_score: number | null;
  training_score: number | null;
  training_certificate_url: string | null;
  trial_tickets_completed: number;
  notes: string | null;
  rejection_reason: string | null;
  age: number | null;
  coordinator: { id: string; full_name: string; phone: string } | null;
  trial_tickets: Array<{
    id: string;
    ticket_no: string;
    status: string;
    resolved_at: Date | null;
  }>;
};

const PIPELINE: CandidateStatus[] = [
  "NEW",
  "SCREENING",
  "TRAINING",
  "TRIAL",
  "APPROVED",
];

export function CandidateDetailClient({ candidate }: { candidate: CandidateDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState(String(candidate.screening_score ?? 70));
  const [notes, setNotes] = useState(candidate.notes ?? "");
  const [trainScore, setTrainScore] = useState(String(candidate.training_score ?? 70));
  const [certUrl, setCertUrl] = useState(candidate.training_certificate_url ?? "");
  const [blacklistReason, setBlacklistReason] = useState("");

  async function onScreen(pass: boolean) {
    setBusy(true);
    const res = await screeningAction({
      id: candidate.id,
      screening_score: Number(score) || 0,
      notes,
      pass,
    });
    setBusy(false);
    if (!res.success) toast.error(res.error);
    else {
      toast.success(pass ? "Lolos screening → TRAINING" : "Ditolak");
      router.refresh();
    }
  }

  async function onTrain(pass: boolean) {
    setBusy(true);
    const res = await trainingAction({
      id: candidate.id,
      training_score: Number(trainScore) || 0,
      training_certificate_url: certUrl || undefined,
      pass,
    });
    setBusy(false);
    if (!res.success) toast.error(res.error);
    else {
      toast.success(pass ? "Lolos training → TRIAL" : "Ditolak");
      router.refresh();
    }
  }

  async function onApprove() {
    setBusy(true);
    const res = await approveCandidateAction(candidate.id);
    setBusy(false);
    if (!res.success) toast.error(res.error);
    else {
      toast.success(
        `Approved! Login ${res.phone} / ${res.password}`
      );
      router.refresh();
    }
  }

  async function onBlacklist() {
    if (!blacklistReason.trim()) {
      toast.error("Isi alasan blacklist");
      return;
    }
    setBusy(true);
    const res = await blacklistCandidateAction(candidate.id, blacklistReason);
    setBusy(false);
    if (!res.success) toast.error(res.error);
    else {
      toast.success("Blacklisted");
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {PIPELINE.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <Badge
              variant={
                candidate.status === s
                  ? "default"
                  : PIPELINE.indexOf(candidate.status) > i
                    ? "success"
                    : "outline"
              }
            >
              {s}
            </Badge>
            {i < PIPELINE.length - 1 && (
              <span className="text-muted-foreground">→</span>
            )}
          </div>
        ))}
        {(candidate.status === "REJECTED" || candidate.status === "BLACKLISTED") && (
          <Badge variant="destructive">{candidate.status}</Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Data Kandidat</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Nama</span>
                <br />
                <strong>{candidate.full_name}</strong>
                {candidate.age != null && ` · ${candidate.age} th`}
              </p>
              <p>
                <span className="text-muted-foreground">Kontak</span>
                <br />
                {candidate.phone} / WA {candidate.whatsapp}
              </p>
              <p className="sm:col-span-2">
                <span className="text-muted-foreground">Alamat</span>
                <br />
                {candidate.address}, {candidate.district}, {candidate.city},{" "}
                {candidate.province}
              </p>
              <p>
                Pendidikan: {candidate.education}
                {candidate.school_name ? ` · ${candidate.school_name}` : ""}
              </p>
              <p>
                Skill: {candidate.skills.join(", ")} · Exp{" "}
                {candidate.experience_years} th
              </p>
              <p>
                Motor: {candidate.has_motorcycle ? "Ya" : "Tidak"} · Toolkit:{" "}
                {candidate.has_toolkit ? "Ya" : "Tidak"} · Laptop:{" "}
                {candidate.has_laptop ? "Ya" : "Tidak"}
                <br />
                Mobil: {candidate.has_car ? "Ya" : "Tidak"} · Tangga:{" "}
                {candidate.has_ladder ? "Ya" : "Tidak"} · Bor:{" "}
                {candidate.has_drill ? "Ya" : "Tidak"}
                {!candidate.has_motorcycle &&
                  !candidate.has_toolkit &&
                  !candidate.has_laptop &&
                  !candidate.has_car &&
                  !candidate.has_ladder &&
                  !candidate.has_drill && (
                    <span className="text-amber-700">
                      {" "}
                      · Tools owned belum lengkap
                    </span>
                  )}
              </p>
              <p>
                Vendor sebelumnya: {candidate.previous_vendor || "—"}
              </p>
              <p>
                Bank: {candidate.bank_name || "—"} {candidate.bank_account_no}
              </p>
              <p>
                Koordinator: {candidate.coordinator?.full_name ?? "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dokumen</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
              {candidate.id_card_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={candidate.id_card_photo_url}
                  alt="KTP"
                  className="h-40 rounded-lg border object-cover"
                />
              )}
              {candidate.selfie_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={candidate.selfie_photo_url}
                  alt="Selfie"
                  className="h-40 rounded-lg border object-cover"
                />
              )}
            </CardContent>
          </Card>

          {candidate.lat != null && candidate.lng != null && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lokasi Rumah</CardTitle>
              </CardHeader>
              <CardContent>
                <MapPicker
                  lat={candidate.lat}
                  lng={candidate.lng}
                  onChange={() => {}}
                  height="240px"
                />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-3">
          {(candidate.status === "NEW" || candidate.status === "SCREENING") && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Screening</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {candidate.skills.some((s) =>
                  ["SDWAN", "Mikrotik", "Fortigate", "Cisco"].includes(s)
                ) && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
                    <p className="font-medium">Pertanyaan tambahan SDWAN</p>
                    <p className="mt-1">• Pernah config router? Sebutkan tipe.</p>
                    <p>• Paham IP Static / DHCP / NAT?</p>
                    <p className="mt-1 text-xs text-violet-700">
                      Catat jawaban di notes sebelum lolos screening.
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <Label>Score (0-100)</Label>
                  <Input
                    type="number"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={busy}
                    onClick={() => void onScreen(true)}
                  >
                    Lolos Screening
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => void onScreen(false)}
                  >
                    Tolak
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {candidate.status === "TRAINING" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Training</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Training score</Label>
                  <Input
                    type="number"
                    value={trainScore}
                    onChange={(e) => setTrainScore(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>URL sertifikat</Label>
                  <Input
                    value={certUrl}
                    onChange={(e) => setCertUrl(e.target.value)}
                    placeholder="/uploads/..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={busy}
                    onClick={() => void onTrain(true)}
                  >
                    Lolos Training
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => void onTrain(false)}
                  >
                    Tolak
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {candidate.status === "TRIAL" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trial & Approve</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ticket trial: {candidate.trial_tickets.length} ditemukan
                </p>
                <ul className="space-y-1 text-sm">
                  {candidate.trial_tickets.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/admin/tickets/${t.id}`}
                        className="font-mono text-primary underline"
                      >
                        {t.ticket_no}
                      </Link>{" "}
                      · {t.status}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={busy}
                  onClick={() => void onApprove()}
                >
                  Approve Jadi Engineer
                </Button>
              </CardContent>
            </Card>
          )}

          {candidate.status !== "BLACKLISTED" &&
            candidate.status !== "APPROVED" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Blacklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Alasan"
                    value={blacklistReason}
                    onChange={(e) => setBlacklistReason(e.target.value)}
                  />
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={busy}
                    onClick={() => void onBlacklist()}
                  >
                    Blacklist
                  </Button>
                </CardContent>
              </Card>
            )}

          {candidate.rejection_reason && (
            <p className="text-sm text-destructive">{candidate.rejection_reason}</p>
          )}
        </div>
      </div>
    </div>
  );
}
