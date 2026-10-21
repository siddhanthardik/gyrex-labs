/**
 * Normalizes a raw user-provided hostname or HTTP Host header.
 * Strips protocols, paths, query strings, port numbers, whitespace, and trailing dots.
 * Converts to lowercase.
 */
export function normalizeHostname(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  let cleaned = raw.trim().toLowerCase();

  // Strip protocol schemes if user pasted URL
  cleaned = cleaned.replace(/^[a-z0-9]+:\/\//, "");

  // Strip leading slashes
  cleaned = cleaned.replace(/^\/+/, "");

  // Strip paths, query parameters, fragments
  cleaned = cleaned.split("/")[0].split("?")[0].split("#")[0];

  // Handle bracketed IPv6 with or without port: [::1]:3000 -> ::1
  if (cleaned.startsWith("[") && cleaned.includes("]")) {
    cleaned = cleaned.replace(/^\[([a-f0-9:]+)\](:\d+)?$/, "$1");
  } else if (/^([^:]+):(\d+)$/.test(cleaned)) {
    // Single colon followed only by port digits: domain.com:3000 -> domain.com
    cleaned = cleaned.replace(/:\d+$/, "");
  }

  // Strip trailing dot from FQDN representation
  cleaned = cleaned.replace(/\.+$/, "");

  return cleaned.trim();
}
