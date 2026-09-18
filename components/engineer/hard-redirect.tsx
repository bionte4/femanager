"use client";

import { useEffect } from "react";

/** Hard navigation — hindari soft RSC redirect yang bisa nyangkut blank. */
export function HardRedirect({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      Mengalihkan…
      <noscript>
        <a href={href} className="underline">
          Lanjut
        </a>
      </noscript>
    </div>
  );
}
