"use client";

import { useEffect } from "react";

/** Register service worker + PWA meta untuk halaman engineer */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.warn("[sw] register failed", err));
  }, []);

  return null;
}
