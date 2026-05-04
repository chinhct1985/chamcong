"use client";

import {
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { browserSupportsWebAuthn, isIOSBrowser } from "@/lib/client-ios";

export function IosPasskeyRegisterSection() {
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setShow(isIOSBrowser() && browserSupportsWebAuthn());
  }, []);

  if (!show) return null;

  async function register() {
    setPending(true);
    try {
      const begin = await fetch("/api/webauthn/register/begin", {
        method: "POST",
        credentials: "include",
      });
      let beginJson: {
        challengeId?: string;
        options?: unknown;
        error?: string;
      };
      try {
        beginJson = (await begin.json()) as typeof beginJson;
      } catch {
        toast.error("Phản hồi máy chủ không hợp lệ");
        return;
      }
      if (!begin.ok) {
        toast.error(beginJson.error ?? "Không bắt đầu được đăng ký Face ID");
        return;
      }
      if (
        typeof beginJson.challengeId !== "string" ||
        !beginJson.options ||
        typeof beginJson.options !== "object"
      ) {
        toast.error("Dữ liệu đăng ký Face ID không hợp lệ");
        return;
      }

      const credential = await startRegistration({
        optionsJSON: beginJson.options as PublicKeyCredentialCreationOptionsJSON,
      });

      const finish = await fetch("/api/webauthn/register/finish", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: beginJson.challengeId,
          credential,
        }),
      });
      let finishJson: { ok?: boolean; error?: string };
      try {
        finishJson = (await finish.json()) as typeof finishJson;
      } catch {
        toast.error("Phản hồi máy chủ không hợp lệ");
        return;
      }
      if (!finish.ok) {
        toast.error(finishJson.error ?? "Đăng ký Face ID thất bại");
        return;
      }
      toast.success("Đã bật đăng nhập Face ID cho thiết bị này");
      window.location.reload();
    } catch (e) {
      const err = e as Error;
      if (err?.name === "NotAllowedError") {
        toast.message("Đã huỷ hoặc Face ID không khả dụng");
        return;
      }
      toast.error("Lỗi đăng ký Face ID — thử lại");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm text-slate-700">
      <p className="font-medium text-slate-800">Face ID trên iPhone</p>
      <p className="mt-1 text-xs text-slate-600">
        Sau khi bật, lần sau có thể đăng nhập bằng Face ID từ trang đăng nhập (Safari, HTTPS).
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => void register()}
        className="btn-secondary mt-2 w-full sm:w-auto"
      >
        {pending ? "Đang mở Face ID…" : "Bật đăng nhập Face ID trên thiết bị này"}
      </button>
    </div>
  );
}
