"use client";

import { useEffect } from "react";

/** Hard navigation — hindari soft RSC redirect yang bisa nyangkut blank. */
export function HardRedirect({ href }: { href: string }) {
  useEffect(() => {
    // Hindari replace loop jika sudah di URL target (pathname sama)
    try {
      const target = new URL(href, window.location.origin);
      if (
        window.location.pathname === target.pathname &&
        window.location.search === target.search
      ) {
        return;
      }
    } catch {
      /* fall through */
    }
    window.location.replace(href);
  }, [href]);

  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      Mengalihkan…
      <noscript>
        <a href={href} className="ml-1 underline">
          Lanjut
        </a>
      </noscript>
    </div>
  );
}
