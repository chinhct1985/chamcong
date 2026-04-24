"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
export function AdminNav({
  optionsNavLabel = "Loại CC",
}: {
  /** Truyền từ Server Layout — tránh lệch hydration với bundle client cũ. */
  optionsNavLabel?: string;
}) {
  const pathname = usePathname() ?? "";
  /** Tránh lệch class active giữa HTML SSR và bản client khi dùng usePathname(). */
  const [navReady, setNavReady] = useState(false);
  useEffect(() => {
    setNavReady(true);
  }, []);

  async function logout() {
    try {
      const res = await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Không đăng xuất được — thử lại");
        return;
      }
    } catch {
      toast.error("Không đăng xuất được — thử lại");
      return;
    }
    window.location.assign("/admin/login");
  }

  const linkCls = (href: string) => {
    const active = navReady && pathname.replace(/\/$/, "") === href;
    return `rounded-lg px-3 py-2 text-sm font-medium transition ${
      active
        ? "bg-white/20 text-white shadow-sm"
        : "text-blue-100 hover:bg-white/10 hover:text-white"
    }`;
  };

  return (
    <header className="border-b border-blue-700 bg-blue-600 shadow-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
        <span className="mr-2 text-sm font-bold tracking-tight text-white">
          Admin
        </span>
        <nav className="flex flex-wrap items-center gap-1">
          <Link href="/admin/users" className={linkCls("/admin/users")}>
            Nhân viên
          </Link>
          <Link href="/admin/options" className={linkCls("/admin/options")}>
            {optionsNavLabel}
          </Link>
          <Link href="/admin/holidays" className={linkCls("/admin/holidays")}>
            Ngày nghỉ lễ
          </Link>
        </nav>
        <button
          type="button"
          onClick={() => void logout()}
          className="ml-auto rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
