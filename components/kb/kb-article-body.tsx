/**
 * Render markdown sederhana untuk SOP KB (heading, list, paragraf).
 * Tanpa dependency markdown parser.
 */
export function KbArticleBody({ content }: { content: string }) {
  const blocks = content.trim().split(/\n{2,}/);

  return (
    <div className="space-y-2.5 text-[13px] leading-snug text-foreground">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const first = lines[0] ?? "";

        if (/^###\s+/.test(first)) {
          return (
            <div key={i} className="space-y-1">
              <h4 className="text-sm font-semibold tracking-tight">
                {first.replace(/^###\s+/, "")}
              </h4>
              {lines.slice(1).map((l, j) => (
                <p key={j} className="text-muted-foreground">
                  {stripBold(l.replace(/^[-*]\s+/, "• "))}
                </p>
              ))}
            </div>
          );
        }
        if (/^##\s+/.test(first)) {
          return (
            <div key={i} className="space-y-1">
              <h3 className="text-[15px] font-semibold tracking-tight">
                {first.replace(/^##\s+/, "")}
              </h3>
              {lines.slice(1).map((l, j) => (
                <p key={j}>{stripBold(l)}</p>
              ))}
            </div>
          );
        }
        if (/^#\s+/.test(first)) {
          return (
            <div key={i} className="space-y-1">
              <h2 className="text-base font-semibold tracking-tight">
                {first.replace(/^#\s+/, "")}
              </h2>
              {lines.slice(1).map((l, j) => (
                <p key={j}>{stripBold(l)}</p>
              ))}
            </div>
          );
        }

        const listLines = lines.filter((l) => l.trim());
        const isList =
          listLines.length > 0 &&
          listLines.every(
            (l) => /^[-*]\s+/.test(l.trim()) || /^\d+[.)]\s+/.test(l.trim())
          );
        if (isList) {
          return (
            <ul key={i} className="list-disc space-y-0.5 pl-4">
              {listLines.map((l, j) => (
                <li key={j}>
                  {stripBold(
                    l.trim().replace(/^[-*]\s+/, "").replace(/^\d+[.)]\s+/, "")
                  )}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap">
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {stripBold(l)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function stripBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, "$1");
}
