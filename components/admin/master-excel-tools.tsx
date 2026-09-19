"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export type MasterPreviewAction = "create" | "update" | "error";

type ActionResult<T> =
  | { success: true; data?: T }
  | { success: false; error: string };

type PreviewResult<TRow> = {
  rows: TRow[];
  okCount: number;
  errorCount: number;
};

type CommitResult = { created: number; updated: number };

type PreviewColumn<TRow> = {
  key: keyof TRow & string;
  label: string;
  className?: string;
};

type MasterExcelToolsProps<TRow extends { row: number; action: MasterPreviewAction; errors: string[] }> = {
  entityLabel: string;
  sheetName: string;
  filePrefix: string;
  headers: readonly string[];
  sampleRow: Record<string, unknown>;
  previewColumns: PreviewColumn<TRow>[];
  getExportRows: () => Promise<Record<string, unknown>[]>;
  previewImport: (
    raw: Record<string, unknown>[]
  ) => Promise<ActionResult<PreviewResult<TRow>>>;
  commitImport: (
    rows: TRow[]
  ) => Promise<ActionResult<CommitResult>>;
};

export function MasterExcelTools<
  TRow extends { row: number; action: MasterPreviewAction; errors: string[] },
>({
  entityLabel,
  sheetName,
  filePrefix,
  headers,
  sampleRow,
  previewColumns,
  getExportRows,
  previewImport,
  commitImport,
}: MasterExcelToolsProps<TRow>) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [exporting, setExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<TRow[]>([]);
  const [okCount, setOkCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [committing, setCommitting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const rows = await getExportRows();
      const sheet = XLSX.utils.json_to_sheet(
        rows.length ? rows : [sampleRow],
        { header: [...headers] }
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, sheet, sheetName);
      XLSX.writeFile(wb, `${filePrefix}-export-${Date.now()}.xlsx`);
      toast.success(`Excel ${entityLabel} diunduh`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal export");
    } finally {
      setExporting(false);
    }
  }

  async function handleFile(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });

      const result = await previewImport(json);
      if (!result.success || !result.data) {
        toast.error(result.success === false ? result.error : "Preview gagal");
        return;
      }

      setPreviewRows(result.data.rows);
      setOkCount(result.data.okCount);
      setErrorCount(result.data.errorCount);
      setPreviewOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal baca Excel");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleCommit() {
    if (errorCount > 0) {
      toast.error("Perbaiki baris error dulu sebelum import");
      return;
    }
    setCommitting(true);
    const result = await commitImport(previewRows);
    setCommitting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Import sukses: ${result.data?.created ?? 0} create, ${result.data?.updated ?? 0} update`
    );
    setPreviewOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          disabled={exporting}
          onClick={() => void handleExport()}
        >
          <Download className="h-3.5 w-3.5" />
          {exporting ? "Export…" : "Export Excel"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          Import Excel
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Preview Import {entityLabel}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {okCount} valid · {errorCount} error — commit hanya jika semua
            valid. Baris update = key sudah ada di DB.
          </p>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  {previewColumns.map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                  <TableHead>Aksi</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((r) => (
                  <TableRow key={`${r.row}-${String(r[previewColumns[0]?.key] ?? "")}`}>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.row}
                    </TableCell>
                    {previewColumns.map((c) => (
                      <TableCell
                        key={c.key}
                        className={c.className ?? "text-sm"}
                      >
                        {String(r[c.key] ?? "")}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Badge
                        variant={
                          r.action === "error"
                            ? "destructive"
                            : r.action === "update"
                              ? "warning"
                              : "success"
                        }
                      >
                        {r.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] text-xs text-destructive">
                      {r.errors.join("; ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={committing || errorCount > 0 || okCount === 0}
              onClick={() => void handleCommit()}
            >
              {committing ? "Importing…" : `Commit ${okCount} baris`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
