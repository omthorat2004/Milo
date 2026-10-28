export type DeviceCategory = "mobile" | "tablet" | "desktop";

/** Coarse category only, matches Milo's allowed-signal list (no model, no
 * fingerprinting). Tablet is checked before mobile since iPad/Android tablet
 * UAs also contain substrings that would otherwise match the mobile branch. */
export function detectDeviceCategory(userAgent: string): DeviceCategory {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/.test(ua)) return "tablet";
  if (/mobi|iphone|ipod|android/.test(ua)) return "mobile";
  return "desktop";
}

export function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("chrome") || ua.includes("crios")) return "Chrome";
  if (ua.includes("safari")) return "Safari";
  return "Other";
}

export function detectOS(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes("windows")) return "Windows";
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macOS";
  if (ua.includes("android")) return "Android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "iOS";
  if (ua.includes("linux")) return "Linux";
  return "Other";
}
