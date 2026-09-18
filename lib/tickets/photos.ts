/** Ambil semua photo_url dari TicketLog (server-safe, tanpa "use client") */
export function collectLogPhotos(
  logs: Array<{ photo_url: string[] }>
): string[] {
  return logs.flatMap((l) => l.photo_url ?? []);
}
