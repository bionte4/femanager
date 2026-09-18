"use client";

import { useMemo, useState } from "react";
import { formatRupiah } from "@/lib/utils/rupiah";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Cat = { code: string; name: string; fee: number };

/** Contoh: 3 CCTV + 5 Laptop = estimasi penghasilan mingguan */
export function EarningsCalculator({ categories }: { categories: Cat[] }) {
  const defaults = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of categories) {
      if (c.code === "CCTV") map[c.code] = 3;
      else if (c.code === "LAPTOP") map[c.code] = 5;
      else map[c.code] = 0;
    }
    return map;
  }, [categories]);

  const [qty, setQty] = useState<Record<string, number>>(defaults);

  const total = categories.reduce(
    (sum, c) => sum + (qty[c.code] ?? 0) * c.fee,
    0
  );

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
      <p className="text-center text-sm text-emerald-100/70">
        Hitung perkiraan fee minggu ini (pakai fee Tier 1 Jabodetabek)
      </p>
      <div className="space-y-3">
        {categories.map((c) => (
          <div
            key={c.code}
            className="flex items-center justify-between gap-3"
          >
            <Label className="flex-1 text-sm text-emerald-50">
              {c.name}
              <span className="ml-1 text-xs text-emerald-200/50">
                × {formatRupiah(c.fee)}
              </span>
            </Label>
            <Input
              type="number"
              min={0}
              max={50}
              className="w-20 border-emerald-500/30 bg-[#0c1a14] text-white"
              value={qty[c.code] ?? 0}
              onChange={(e) =>
                setQty((q) => ({
                  ...q,
                  [c.code]: Math.max(0, Number(e.target.value) || 0),
                }))
              }
            />
          </div>
        ))}
      </div>
      <p className="text-center text-2xl font-bold text-emerald-300">
        {formatRupiah(total)}
        <span className="ml-1 text-sm font-normal text-emerald-100/50">
          / minggu
        </span>
      </p>
    </div>
  );
}
