#!/usr/bin/env bash
# Giải phóng cổng 3040 (WSL + Windows) rồi chạy Next dev (ChamCong).
# WSL2: Next đôi khi chạy từ Windows — fuser trong Linux không kill được → cần PowerShell.
#
# Nếu gặp 500 / "Internal Server Error" + log ENOENT .../.next/dev/routes-manifest.json:
# xoá toàn bộ .next rồi chạy lại (WSL+Windows cùng chạm ổ D:\ hoặc xoá .next lúc dev còn chạy).
#   CLEAN_NEXT=1 ./scripts/restart-dev.sh
# hoặc: npm run dev:clean
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT=3040

if [[ "${CLEAN_NEXT:-0}" == "1" || "${CLEAN_NEXT:-0}" == "true" ]]; then
  echo "[restart-dev] xoá .next (CLEAN_NEXT=1)..."
  rm -rf "$ROOT/.next"
fi

# --- Linux (WSL) ---
for _ in 1 2 3; do
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" 2>/dev/null && sleep 1 || true
  fi
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -t -iTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "${pids}" ]]; then
      # shellcheck disable=SC2086
      kill -9 ${pids} 2>/dev/null || true
      sleep 1
    fi
  fi
done

pkill -9 -f "next dev.*${PORT}" 2>/dev/null || true
pkill -9 -f "next-server" 2>/dev/null || true
sleep 1

# --- Windows (khi process giữ 3040 nằm trên host Windows) ---
POWERSHELL=""
if command -v powershell.exe >/dev/null 2>&1; then
  POWERSHELL="powershell.exe"
elif [[ -x "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe" ]]; then
  POWERSHELL="/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
fi

if [[ -n "${POWERSHELL}" ]]; then
  # Dừng mọi tiến trình đang LISTEN trên cổng này (thường là node.exe)
  "${POWERSHELL}" -NoProfile -ExecutionPolicy Bypass -Command \
    "\$p=${PORT}; Get-NetTCPConnection -LocalPort \$p -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force -ErrorAction SilentlyContinue }" \
    2>/dev/null || true
  sleep 2
fi

exec npm run dev
