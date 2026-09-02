"use client";
import { useEffect } from "react";

// Polling also reaches payments made on another staff member's phone.
export function useLiveRefresh(refresh: () => Promise<void>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const initial = window.setTimeout(refresh, 0);
    const interval = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => { window.clearTimeout(initial); window.clearInterval(interval); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); };
  }, [enabled, refresh]);
}
