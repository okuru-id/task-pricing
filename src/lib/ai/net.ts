import { isIP } from "node:net";

/**
 * Deteksi alamat IP yang bukan tujuan internet publik (loopback, jaringan privat, link-local, metadata cloud,
 * multicast, dsb.). Murni dan tanpa DNS — dipakai oleh validasi Base URL dan oleh koneksi sungguhan (guarded fetch).
 */

function parseIPv4(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const bytes = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : NaN));
  return bytes.every((b) => b >= 0 && b <= 255) ? bytes : null;
}

/** 16 byte dari alamat IPv6 (mendukung `::`, IPv4 tertanam di ujung, dan zone id). */
function parseIPv6(raw: string): number[] | null {
  const ip = raw.split("%")[0];
  const lastColon = ip.lastIndexOf(":");
  let text = ip;

  // Bentuk campuran ::ffff:1.2.3.4 → ubah bagian IPv4 jadi dua grup hex.
  if (ip.includes(".")) {
    const v4 = parseIPv4(ip.slice(lastColon + 1));
    if (!v4) return null;
    text = `${ip.slice(0, lastColon + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }

  const halves = text.split("::");
  if (halves.length > 2) return null;

  const toGroups = (part: string) => (part === "" ? [] : part.split(":"));
  const head = toGroups(halves[0]);
  const tail = halves.length === 2 ? toGroups(halves[1]) : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;

  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...tail];
  const bytes: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    const value = parseInt(group, 16);
    bytes.push(value >> 8, value & 0xff);
  }
  return bytes.length === 16 ? bytes : null;
}

function isPrivateIPv4([a, b, c]: number[]): boolean {
  return (
    a === 0 || // 0.0.0.0/8
    a === 10 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT 100.64.0.0/10
    a === 127 ||
    (a === 169 && b === 254) || // link-local + metadata cloud
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) || // 192.0.0.0/24, 192.0.2.0/24
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmark 198.18.0.0/15
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224 // multicast + reserved + broadcast
  );
}

export function isPrivateAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, "");
  const family = isIP(ip);

  if (family === 4) {
    const v4 = parseIPv4(ip);
    return v4 ? isPrivateIPv4(v4) : true;
  }
  if (family === 6) {
    const b = parseIPv6(ip);
    if (!b) return true; // tidak bisa diurai → anggap tidak aman

    const zeros = (from: number, to: number) => b.slice(from, to).every((x) => x === 0);

    if (zeros(0, 15) && (b[15] === 0 || b[15] === 1)) return true; // :: dan ::1
    if ((b[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique-local
    if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
    if (b[0] === 0xff) return true; // multicast
    if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return true; // 2001:db8::/32 dokumentasi
    if (zeros(0, 10) && b[10] === 0xff && b[11] === 0xff) return isPrivateIPv4(b.slice(12)); // ::ffff:a.b.c.d
    if (zeros(0, 12)) return isPrivateIPv4(b.slice(12)); // ::a.b.c.d (IPv4-compatible)
    if (b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b && zeros(4, 12)) return isPrivateIPv4(b.slice(12)); // NAT64
    if (b[0] === 0x20 && b[1] === 0x02) return isPrivateIPv4(b.slice(2, 6)); // 6to4 menanam IPv4
    return false;
  }

  return true; // bukan IP valid
}

/** Nama host yang pasti menunjuk jaringan lokal/privat tanpa perlu DNS. */
export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (isIP(host.replace(/^\[|\]$/g, "")) !== 0) return isPrivateAddress(host);

  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host.endsWith(".home.arpa") ||
    !host.includes(".") // nama satu-label (mis. "ollama", "intranet") hanya ada di jaringan privat
  );
}
