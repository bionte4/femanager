export default function AgreementLoading() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Memuat perjanjian">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-muted" />
        <div className="h-4 w-full max-w-sm rounded-md bg-muted" />
      </div>
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="mt-4 h-32 w-full rounded-lg bg-muted" />
      </div>
      <div className="h-14 w-full rounded-lg bg-muted" />
      <p className="text-center text-xs text-muted-foreground">
        Memuat perjanjian kemitraan…
      </p>
    </div>
  );
}
