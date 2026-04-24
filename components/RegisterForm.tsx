"use client";

import Link from "next/link";
import { formatFullNameTitleCase } from "@/lib/validation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type EtOpt = { id: string; name: string; sortOrder: number };

export function RegisterForm({
  initialEmployeeTypes = [],
}: {
  initialEmployeeTypes?: EtOpt[];
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [employeeTypeId, setEmployeeTypeId] = useState("");
  const [pending, setPending] = useState(false);

  async function submitRegister() {
    if (!employeeTypeId) {
      toast.error("Chọn loại nhân viên");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          password,
          employeeTypeId,
        }),
        credentials: "include",
      });

      let data: { error?: string } = {};
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text) as { error?: string };
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (res.status === 409) {
          toast.error(
            typeof data.error === "string"
              ? data.error
              : "Số điện thoại đã tồn tại"
          );
        } else {
          toast.error(
            typeof data.error === "string"
              ? data.error
              : `Đăng ký thất bại (${res.status})`
          );
        }
        return;
      }

      toast.success("Đăng ký thành công — vui lòng đăng nhập");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Không thể kết nối máy chủ. Kiểm tra mạng hoặc chạy lại dev server.");
    } finally {
      setPending(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    void submitRegister();
  }

  const typeOptions =
    initialEmployeeTypes.length > 0
      ? [...initialEmployeeTypes].sort((a, b) => a.sortOrder - b.sortOrder)
      : [];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md flex-col justify-center px-4 py-12">
      <div className="card">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Chấm công
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Đăng ký</h1>
          <p className="mt-1 text-sm text-slate-600">
            Tạo tài khoản bằng họ tên, loại nhân viên, số điện thoại và mật khẩu
          </p>
        </div>

        <form method="post" onSubmit={handleFormSubmit} className="flex flex-col gap-5">
          <div className="form-field">
            <label htmlFor="reg-name" className="form-label">
              Họ và tên
            </label>
            <input
              id="reg-name"
              name="fullName"
              className="form-control"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={(e) => {
                const v = e.currentTarget.value;
                if (v.trim().length > 0) {
                  setFullName(formatFullNameTitleCase(v));
                }
              }}
              placeholder="Nguyễn Văn A"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="reg-emp-type" className="form-label">
              Loại nhân viên
            </label>
            <select
              id="reg-emp-type"
              name="employeeTypeId"
              className="form-control"
              value={employeeTypeId}
              onChange={(e) => setEmployeeTypeId(e.target.value)}
              required
              disabled={typeOptions.length === 0}
            >
              <option value="">
                {typeOptions.length === 0
                  ? "— Chưa cấu hình loại NV (liên hệ admin) —"
                  : "— Chọn —"}
              </option>
              {typeOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="reg-phone" className="form-label">
              Số điện thoại
            </label>
            <input
              id="reg-phone"
              name="phone"
              className="form-control"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              inputMode="numeric"
              placeholder="Dùng làm tên đăng nhập"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="reg-password" className="form-label">
              Mật khẩu
            </label>
            <input
              id="reg-password"
              name="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              placeholder="Tối thiểu 6 ký tự"
              required
            />
          </div>
          <button
            type="submit"
            disabled={pending || typeOptions.length === 0}
            className="btn-primary mt-1 w-full"
          >
            {pending ? "Đang xử lý…" : "Đăng ký"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Đã có tài khoản?{" "}
          <Link href="/login" className="link-accent">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
