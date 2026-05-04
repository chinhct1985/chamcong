"use client";

import {
  startAuthentication,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { browserSupportsWebAuthn, isIOSBrowser } from "@/lib/client-ios";
import { readApiJson } from "@/lib/read-api-json";

export function FaceIdLoginIos() {
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setShow(isIOSBrowser() && browserSupportsWebAuthn());
  }, []);

  if (!show) return null;

  async function onFaceIdLogin() {
    setPending(true);
    try {
      const begin = await fetch("/api/webauthn/login/begin", {
        method: "POST",
        credentials: "include",
      });
      const beginParsed = await readApiJson<{
        challengeId?: string;
        options?: unknown;
        error?: string;
      }>(begin);
      if (!beginParsed.ok) {
        toast.error(beginParsed.error);
        return;
      }
      const beginJson = beginParsed.data;
      if (!begin.ok) {
        toast.error(beginJson.error ?? "Không bắt đầu được đăng nhập Face ID");
        return;
      }
      if (
        typeof beginJson.challengeId !== "string" ||
        !beginJson.options ||
        typeof beginJson.options !== "object"
      ) {
        toast.error("Dữ liệu đăng nhập Face ID không hợp lệ");
        return;
      }

      const credential = await startAuthentication({
        optionsJSON: beginJson.options as PublicKeyCredentialRequestOptionsJSON,
      });

      const finish = await fetch("/api/webauthn/login/finish", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: beginJson.challengeId,
          credential,
        }),
      });
      const finishParsed = await readApiJson<{ ok?: boolean; error?: string }>(
        finish
      );
      if (!finishParsed.ok) {
        toast.error(finishParsed.error);
        return;
      }
      const finishJson = finishParsed.data;
      if (!finish.ok) {
        toast.error(finishJson.error ?? "Đăng nhập Face ID thất bại");
        return;
      }
      window.location.assign("/");
    } catch (e) {
      const err = e as Error;
      if (err?.name === "NotAllowedError") {
        toast.message("Đã huỷ hoặc Face ID không khả dụng");
        return;
      }
      toast.error("Lỗi Face ID — thử lại hoặc dùng mật khẩu");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-5 border-t border-slate-200 pt-5">
      <p className="mb-3 text-center text-xs text-slate-500">
        Trên iPhone: đăng nhập nhanh bằng Face ID sau khi đã bật trong trang chấm công
        (cần HTTPS trên domain thật).
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => void onFaceIdLogin()}
        className="btn-secondary w-full"
      >
        {pending ? "Đang mở Face ID…" : "Đăng nhập bằng Face ID"}
      </button>
    </div>
  );
}
