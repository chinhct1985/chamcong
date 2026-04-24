"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  adminLoginAction,
  type AdminLoginFormState,
} from "@/app/auth/admin/actions";

const initialState: AdminLoginFormState = { error: null };

export function AdminLoginForm({
  managerQuickEntry = false,
}: {
  /** Đang có phiên chấm công tài khoản quản lý — hiện lối đăng nhập nhanh. */
  managerQuickEntry?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    adminLoginAction,
    initialState
  );
  const [quickLoading, setQuickLoading] = useState(false);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  async function continueAsManager() {
    if (quickLoading) return;
    setQuickLoading(true);
    try {
      const res = await fetch("/api/admin/login-as-manager", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(
          data.error === "Forbidden"
            ? "Tài khoản không còn quyền quản lý"
            : (data.error ?? "Không thể tiếp tục — đăng nhập lại ở trang chấm công")
        );
        return;
      }
      toast.success("Đã mở phiên quản trị");
      router.push("/admin/users");
      router.refresh();
    } catch {
      toast.error("Lỗi mạng — thử lại");
    } finally {
      setQuickLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-sm flex-col justify-center px-4 py-12">
      <div className="card border-blue-200">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Quản trị
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Đăng nhập Admin
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Tài khoản hệ thống, hoặc số điện thoại + mật khẩu tài khoản{" "}
            <span className="font-medium">quản lý</span>
          </p>
        </div>

        {managerQuickEntry ? (
          <div className="mb-5">
            <button
              type="button"
              onClick={() => void continueAsManager()}
              disabled={quickLoading}
              className="btn-primary w-full"
            >
              {quickLoading
                ? "Đang mở…"
                : "Tiếp tục bằng tài khoản đang đăng nhập (quản lý)"}
            </button>
            <p className="mt-2 text-center text-xs text-slate-500">hoặc</p>
          </div>
        ) : null}

        <form action={formAction} className="flex flex-col gap-5">
          <div className="form-field">
            <label htmlFor="admin-user" className="form-label">
              Tài khoản hoặc số điện thoại
            </label>
            <input
              id="admin-user"
              name="username"
              className="form-control"
              autoComplete="username"
              placeholder="admin hoặc 09xxxxxxxxx"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="admin-pass" className="form-label">
              Mật khẩu
            </label>
            <input
              id="admin-pass"
              name="password"
              type="password"
              className="form-control"
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Đang xử lý…" : "Đăng nhập"}
          </button>
        </form>

        <p className="mt-6 rounded-lg bg-blue-50 px-3 py-2 text-center text-xs text-slate-600">
          Tài khoản tích hợp sẵn:{" "}
          <span className="font-mono font-medium text-blue-700">admin</span> /{" "}
          <span className="font-mono font-medium text-blue-700">admin</span>
        </p>
      </div>
    </div>
  );
}
