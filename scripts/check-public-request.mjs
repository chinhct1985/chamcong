#!/usr/bin/env node
/**
 * Kiểm tra request “như từ domain”: gọi endpoint dev chỉ bật khi NODE_ENV=development.
 *
 *   PUBLIC_APP_URL=https://chamcong.chinhct.com node scripts/check-public-request.mjs
 *   PUBLIC_APP_URL=http://127.0.0.1:3040 node scripts/check-public-request.mjs
 */
const base = (process.env.PUBLIC_APP_URL ?? "http://127.0.0.1:3040").replace(/\/$/, "");

async function main() {
  const url = `${base}/api/dev/request-headers`;
  const res = await fetch(url);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error(res.status, text.slice(0, 500));
    process.exit(1);
  }
  console.log(JSON.stringify(json, null, 2));
  if (res.status === 404) {
    console.error(
      "\n→ 404: chỉ có trong bản dev (`next dev`). Production không expose route này."
    );
    process.exit(1);
  }
  if (res.ok && json.checklist) {
    const { hasForwardedProtoOrCf, forwardedHostMatchesOriginHost } = json.checklist;
    if (!hasForwardedProtoOrCf) {
      console.warn(
        "\n⚠ Thiếu X-Forwarded-Proto / cf-visitor / Forwarded — cookie Secure & redirect có thể sai qua HTTPS."
      );
    }
    if (forwardedHostMatchesOriginHost === false) {
      console.warn(
        "\n⚠ X-Forwarded-Host (hoặc host) không khớp Origin — Server Action có thể bị CSRF chặn. Thêm domain vào ALLOWED_DEV_ORIGINS hoặc sửa proxy."
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
