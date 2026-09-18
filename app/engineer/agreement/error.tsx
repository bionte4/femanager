"use client";

export default function AgreementError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-3 py-8 text-center">
      <h1 className="text-lg font-semibold">Gagal memuat perjanjian</h1>
      <p className="text-sm text-muted-foreground">
        {error.message || "Terjadi kesalahan. Coba muat ulang."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
      >
        Coba lagi
      </button>
    </div>
  );
}
