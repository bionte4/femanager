"use client";

import { useEffect, useRef, useState } from "react";
import {
  registerPushTokenAction,
  unregisterPushTokenAction,
} from "@/app/actions/push";

declare global {
  interface Window {
    __fetrackFcmToken?: string;
  }
}

/**
 * Register FCM token untuk PWA engineer.
 * Tanpa NEXT_PUBLIC_FIREBASE_* + VAPID → skip (in-app bell tetap jalan).
 */
export function PushRegister() {
  const [status, setStatus] = useState<"idle" | "ok" | "skip" | "err">("idle");
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
    const messagingSenderId =
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    if (!apiKey || !projectId || !appId || !messagingSenderId || !vapidKey) {
      setStatus("skip");
      return;
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("skip");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted" || cancelled) {
          setStatus("skip");
          return;
        }

        const { initializeApp, getApps } = await import("firebase/app");
        const { getMessaging, getToken, isSupported } = await import(
          "firebase/messaging"
        );

        const supported = await isSupported();
        if (!supported || cancelled) {
          setStatus("skip");
          return;
        }

        const app =
          getApps().length > 0
            ? getApps()[0]
            : initializeApp({
                apiKey,
                projectId,
                appId,
                messagingSenderId,
              });

        const messaging = getMessaging(app);
        const swReg = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: swReg,
        });

        if (!token || cancelled) {
          setStatus("skip");
          return;
        }

        window.__fetrackFcmToken = token;
        const result = await registerPushTokenAction({
          token,
          platform: "web",
          user_agent: navigator.userAgent,
        });

        setStatus(result.success ? "ok" : "err");
      } catch (err) {
        console.warn("[fcm] register failed", err);
        if (!cancelled) setStatus("err");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onUnload = () => {
      const token = window.__fetrackFcmToken;
      if (!token) return;
      void unregisterPushTokenAction({ token });
    };
    // Jangan unregister on every unload — token boleh persist lintas session.
    // Hanya cleanup saat explicit logout jika nanti ditambahkan.
    void onUnload;
  }, []);

  if (status === "idle" || status === "skip") return null;

  return (
    <p className="sr-only" aria-live="polite">
      {status === "ok" ? "Push notification aktif" : "Push notification gagal"}
    </p>
  );
}
