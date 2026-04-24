"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  loginAction,
  type LoginFormState,
} from "@/app/login/actions";

const initialState: LoginFormState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="card">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Chấm công
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Đăng nhập</h1>
          <p className="mt-1 text-sm text-slate-600">
            Nhập số điện thoại và mật khẩu đã đăng ký
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-5">
          <div className="form-field">
            <label htmlFor="login-phone" className="form-label">
              Số điện thoại
            </label>
            <input
              id="login-phone"
              name="phone"
              className="form-control"
              autoComplete="tel"
              inputMode="numeric"
              placeholder="Ví dụ: 0901234567"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="login-password" className="form-label">
              Mật khẩu
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              className="form-control"
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" disabled={pending} className="btn-primary mt-1 w-full">
            {pending ? "Đang xử lý…" : "Đăng nhập"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="link-accent">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}
