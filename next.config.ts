import type { NextConfig } from "next";

/**
 * Chuẩn hoá mục trong ALLOWED_DEV_ORIGINS / SERVER_ACTIONS_ALLOWED_ORIGINS:
 * - https://host/path → host
 * - *.example.com giữ nguyên
 */
function parseAllowedHostList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      if (/^https?:\/\//i.test(entry)) {
        try {
          return new URL(entry).host;
        } catch {
          return entry.replace(/^https?:\/\//i, "").split("/")[0] ?? entry;
        }
      }
      return entry;
    });
}

/**
 * Dev: thêm hostname khi mở app bằng domain (file hosts, LAN, tunnel).
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
 */
function allowedDevOriginsFromEnv(): string[] {
  return parseAllowedHostList(process.env.ALLOWED_DEV_ORIGINS);
}

/**
 * Server Actions: Next so khớp Origin với x-forwarded-host / host.
 * Tunnel thường gửi Host: localhost:3040 nhưng Origin: https://domain → CSRF chặn
 * trừ khi domain nằm trong allowedOrigins hoặc proxy gửi đúng X-Forwarded-Host.
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
 */
function serverActionsAllowedOriginsFromEnv(): string[] {
  const fromDev = allowedDevOriginsFromEnv();
  const extra = parseAllowedHostList(process.env.SERVER_ACTIONS_ALLOWED_ORIGINS);
  const devPorts = ["3040", "3000"];
  const localhostVariants = devPorts.flatMap((p) => [
    `localhost:${p}`,
    `127.0.0.1:${p}`,
  ]);
  return [...new Set([...fromDev, ...extra, ...localhostVariants, "localhost", "127.0.0.1"])];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedDevOriginsFromEnv(),
  experimental: {
    serverActions: {
      allowedOrigins: serverActionsAllowedOriginsFromEnv(),
    },
    /** Giảm JS client: chỉ import module con của package. */
    optimizePackageImports: ["sonner"],
  },
};

export default nextConfig;
