import { MonitoringMap } from "@/components/map/monitoring-map";

export default function AdminMapPage() {
  return (
    <div className="-mx-4 -mb-8 lg:-mx-8">
      <div className="mb-3 px-4 lg:px-8">
        <h1 className="text-xl font-semibold tracking-tight">Peta Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Sebaran tenant & engineer realtime — cluster marker, filter, dan buat ticket dari peta.
        </p>
      </div>
      <div className="px-4 lg:px-8">
        <MonitoringMap />
      </div>
    </div>
  );
}
