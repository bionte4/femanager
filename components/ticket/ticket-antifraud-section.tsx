import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type FraudLog = {
  id: string;
  type: string;
  severity: string;
  description: string;
  metadata: unknown;
  is_resolved: boolean;
  created_at: Date;
};

type Rating = {
  system_score: number;
  fraud_flags: string[];
  is_fraud: boolean;
} | null;

type LogGps = {
  lat: number | null;
  lng: number | null;
  exif_lat: number | null;
  exif_lng: number | null;
  photo_hash: string | null;
};

export function TicketAntiFraudSection({
  rating,
  fraudLogs,
  logs,
}: {
  rating: Rating;
  fraudLogs: FraudLog[];
  logs: LogGps[];
}) {
  const checkin = [...logs].reverse().find((l) => l.lat != null && l.lng != null);
  const withExif = [...logs].reverse().find((l) => l.exif_lat != null && l.exif_lng != null);

  if (!rating && fraudLogs.length === 0 && !checkin && !withExif) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Anti-Fraud</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rating && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">System score:</span>
            <span className="font-semibold">{rating.system_score}</span>
            {rating.is_fraud && <Badge variant="destructive">Flagged fraud</Badge>}
            {rating.fraud_flags.map((f) => (
              <Badge key={f} variant="destructive">
                {f}
              </Badge>
            ))}
          </div>
        )}

        {(checkin || withExif) && (
          <div className="grid gap-2 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Lokasi check-in</p>
              {checkin?.lat != null && checkin.lng != null ? (
                <a
                  className="text-primary underline"
                  href={`https://www.google.com/maps?q=${checkin.lat},${checkin.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {checkin.lat.toFixed(5)}, {checkin.lng.toFixed(5)}
                </a>
              ) : (
                <p>—</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lokasi EXIF foto</p>
              {withExif?.exif_lat != null && withExif.exif_lng != null ? (
                <a
                  className="text-primary underline"
                  href={`https://www.google.com/maps?q=${withExif.exif_lat},${withExif.exif_lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {withExif.exif_lat.toFixed(5)}, {withExif.exif_lng.toFixed(5)}
                </a>
              ) : (
                <p className="text-muted-foreground">Tidak ada EXIF GPS</p>
              )}
            </div>
          </div>
        )}

        {fraudLogs.length > 0 && (
          <ul className="space-y-2 text-sm">
            {fraudLogs.map((f) => (
              <li key={f.id} className="rounded border p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      f.severity === "HIGH"
                        ? "destructive"
                        : f.severity === "MEDIUM"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {f.severity}
                  </Badge>
                  <span className="font-medium">{f.type}</span>
                  {f.is_resolved && <Badge variant="outline">Resolved</Badge>}
                </div>
                <p className="mt-1 text-muted-foreground">{f.description}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
