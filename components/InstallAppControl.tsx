"use client";

import { useCallback, useEffect, useState } from "react";
import { isIOSBrowser } from "@/lib/client-ios";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(nav.standalone);
}

/**
 * Chrome/Edge/Android: nút cài qua beforeinstallprompt.
 * iOS Safari: hướng dẫn «Thêm vào Màn hình chính».
 */
export function InstallAppControl({
  className = "",
  compact = false,
}: {
  className?: string;
  /** Nút nhỏ hơn (header trang chủ). */
  compact?: boolean;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [iosGuideOpen, setIosGuideOpen] = useState(false);
  const [showIos, setShowIos] = useState(false);
  const [standalone, setStandalone] = useState(true);

  useEffect(() => {
    setStandalone(isStandaloneDisplay());
    setShowIos(isIOSBrowser());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    const onInstalled = () => {
      setDeferred(null);
      setStandalone(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const installChrome = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* user đóng */
    }
    setDeferred(null);
  }, [deferred]);

  if (standalone) return null;

  const btnClass = [
    compact ? "btn-secondary w-full sm:w-auto text-sm" : "btn-secondary w-full",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (deferred) {
    return (
      <button type="button" className={btnClass} onClick={() => void installChrome()}>
        {compact ? "Cài app" : "Cài đặt ứng dụng"}
      </button>
    );
  }

  if (showIos) {
    return (
      <>
        <button
          type="button"
          className={btnClass}
          onClick={() => setIosGuideOpen(true)}
        >
          {compact ? "Cài app" : "Thêm vào Màn hình chính"}
        </button>
        {iosGuideOpen ? (
          <IosInstallGuideModal onClose={() => setIosGuideOpen(false)} />
        ) : null}
      </>
    );
  }

  return null;
}

function IosInstallGuideModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="ios-install-title"
          className="text-lg font-semibold text-slate-900"
        >
          Cài Chấm công trên iPhone / iPad
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            Mở trang này bằng <strong>Safari</strong> (không dùng Chrome trên
            iOS nếu muốn cài ổn định).
          </li>
          <li>
            Chạm nút <strong>Chia sẻ</strong>{" "}
            <span aria-hidden="true" className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs">
              □↑
            </span>{" "}
            ở thanh dưới (iPhone) hoặc trên cùng (iPad).
          </li>
          <li>
            Chọn <strong>Thêm vào Màn hình chính</strong> → <strong>Thêm</strong>.
          </li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          Icon «Chấm công» sẽ xuất hiện trên màn hình chính và mở dạng ứng dụng
          (toàn màn hình).
        </p>
        <button
          type="button"
          className="btn-primary mt-5 w-full"
          onClick={onClose}
        >
          Đã hiểu
        </button>
      </div>
    </div>
  );
}
