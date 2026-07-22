"use client";

import { useEffect } from "react";

/** Đăng ký service worker (HTTPS / localhost). */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (window.location.protocol !== "https:" && !isLocal) return;

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* bỏ qua — môi trường không hỗ trợ / SW lỗi */
    });
  }, []);

  return null;
}
