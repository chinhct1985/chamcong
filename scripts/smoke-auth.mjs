#!/usr/bin/env node
/**
 * Chạy khi dev server đã bật: node scripts/smoke-auth.mjs
 * Kiểm tra POST /api/login và /api/admin/login có trả Set-Cookie + 200.
 */
const base = process.env.SMOKE_BASE ?? "http://127.0.0.1:3040";

async function main() {
  const u = await fetch(`${base}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "0901234567", password: "123456" }),
  });
  const setUser = u.headers.get("set-cookie");
  const hasUserCookie =
    setUser && /chamcong_user=/i.test(setUser);
  console.log(
    "POST /api/login",
    u.status,
    hasUserCookie ? "Set-Cookie (chamcong_user): ok" : "Set-Cookie: MISSING"
  );

  const a = await fetch(`${base}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "admin" }),
  });
  const setAdmin = a.headers.get("set-cookie");
  console.log(
    "POST /api/admin/login",
    a.status,
    setAdmin ? "Set-Cookie: ok" : "Set-Cookie: MISSING"
  );

  if (!hasUserCookie || !setAdmin) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
