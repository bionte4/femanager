"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SearchFilterBarProps = {
  cities?: string[];
  statusOptions?: { value: string; label: string }[];
  placeholder?: string;
  showCity?: boolean;
  showStatus?: boolean;
  /** Tombol aksi di kanan (Tambah, dll) — satu baris dengan filter */
  actions?: React.ReactNode;
};

export function SearchFilterBar({
  cities = [],
  statusOptions = [],
  placeholder = "Cari...",
  showCity = false,
  showStatus = false,
  actions,
}: SearchFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={searchParams.get("q") ?? ""}
          placeholder={placeholder}
          className="pl-8"
          disabled={pending}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              update("q", (e.target as HTMLInputElement).value);
            }
          }}
          onBlur={(e) => update("q", e.target.value)}
        />
      </div>

      {showCity && (
        <Select
          defaultValue={searchParams.get("city") ?? "all"}
          onValueChange={(v) => update("city", v)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Semua kota" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kota</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showStatus && (
        <Select
          defaultValue={searchParams.get("status") ?? "all"}
          onValueChange={(v) => update("status", v)}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
};

export function Pagination({ page, totalPages, total }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (totalPages <= 1) {
    return <p className="text-xs text-muted-foreground">{total} data</p>;
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        Halaman {page} / {totalPages} · {total} data
      </p>
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
