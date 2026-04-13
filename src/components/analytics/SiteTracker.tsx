"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function getOrCreateStorageId(key: string, storage: Storage): string {
  const existing = storage.getItem(key);
  if (existing && existing.trim()) {
    return existing;
  }

  const next = crypto.randomUUID();
  storage.setItem(key, next);
  return next;
}

function detectDeviceType(userAgent: string): "mobile" | "tablet" | "desktop" {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/i.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod|phone/i.test(ua)) return "mobile";
  return "desktop";
}

function detectOs(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "iOS";
  if (ua.includes("linux")) return "Linux";
  return "Unknown";
}

function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("chrome/")) return "Chrome";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "Safari";
  if (ua.includes("firefox/")) return "Firefox";
  return "Unknown";
}

export function SiteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const lastSentRef = useRef(0);

  const fullPath = useMemo(() => {
    const query = searchParams?.toString() || "";
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const anonymousId = getOrCreateStorageId("perfoumer.analytics.anonymous-id", window.localStorage);
    const sessionId = getOrCreateStorageId("perfoumer.analytics.session-id", window.sessionStorage);
    const userAgent = window.navigator.userAgent || "";

    const send = async () => {
      const now = Date.now();
      if (now - lastSentRef.current < 6000) {
        return;
      }
      lastSentRef.current = now;

      const session = await supabase?.auth.getSession();
      const user = session?.data?.session?.user ?? null;

      const payload = {
        sessionId,
        anonymousId,
        userId: user?.id ?? null,
        isLoggedIn: Boolean(user),
        locale: document.documentElement.lang || "az",
        path: fullPath,
        referrer: document.referrer || "",
        deviceType: detectDeviceType(userAgent),
        os: detectOs(userAgent),
        browser: detectBrowser(userAgent),
      };

      void fetch("/api/analytics/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    };

    void send();

    const heartbeatId = window.setInterval(() => {
      void send();
    }, 30000);

    const visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        void send();
      }
    };

    document.addEventListener("visibilitychange", visibilityHandler);
    return () => {
      window.clearInterval(heartbeatId);
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, [fullPath, supabase]);

  return null;
}
