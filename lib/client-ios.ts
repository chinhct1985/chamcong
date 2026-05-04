/** Phát hiện Safari / WebKit trên iPhone, iPad (kể cả iPadOS báo MacIntel). */
export function isIOSBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  return false;
}

export function browserSupportsWebAuthn(): boolean {
  return typeof window !== "undefined" && typeof window.PublicKeyCredential !== "undefined";
}
