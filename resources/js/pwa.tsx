"use client";
import { useEffect } from "react";
export default function Pwa() {
  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
