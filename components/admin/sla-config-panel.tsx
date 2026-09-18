"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SlaTier } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { updateSlaConfig } from "@/app/actions/sla";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SlaRow = {
  id: string;
  tier_name: SlaTier;
  response_time_minutes: number;
  resolution_time_minutes: number;
};

const TIER_META: Record<SlaTier, { title: string; desc: string }> = {
  TIER1_JABODETABEK: {
    title: "Tier 1 — Jabodetabek",
    desc: "Toko di area Jabodetabek (response cepat)",
  },
  TIER2_PROVINCE: {
    title: "Tier 2 — Provinsi",
    desc: "Ibukota / kota besar luar Jabodetabek",
  },
  TIER3_KABUPATEN: {
    title: "Tier 3 — Kabupaten",
    desc: "Kabupaten / kecamatan pelosok",
  },
};

function SlaCard({ item }: { item: SlaRow }) {
  const router = useRouter();
  const [response, setResponse] = useState(item.response_time_minutes);
  const [resolution, setResolution] = useState(item.resolution_time_minutes);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const meta = TIER_META[item.tier_name];

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    const result = await updateSlaConfig({
      id: item.id,
      response_time_minutes: response,
      resolution_time_minutes: resolution,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMessage("Tersimpan");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{meta.title}</CardTitle>
        <CardDescription>{meta.desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Response time (menit)</Label>
            <Input
              type="number"
              min={1}
              value={response}
              onChange={(e) => setResponse(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Resolution time (menit)</Label>
            <Input
              type="number"
              min={1}
              value={resolution}
              onChange={(e) => setResolution(Number(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={save}
            disabled={saving}
          >
            {saving && <Loader2 className="animate-spin" />}
            Simpan
          </Button>
          {message && <span className="text-sm text-emerald-700">{message}</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function SlaConfigPanel({ items }: { items: SlaRow[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-3">
      {items.map((item) => (
        <SlaCard key={item.id} item={item} />
      ))}
    </div>
  );
}
