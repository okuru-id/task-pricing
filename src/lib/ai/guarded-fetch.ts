import dns from "node:dns";
import { isIP } from "node:net";

import { Agent, fetch as undiciFetch } from "undici";

import { isPrivateAddress, isPrivateHostname } from "./net";

/**
 * Kebijakan operator (bukan konfigurasi AI user): izinkan endpoint di jaringan privat/localhost?
 * Default TIDAK — pada deployment SaaS "localhost" adalah server aplikasi, bukan mesin user.
 * Aktifkan hanya untuk self-host (mis. Ollama lokal): AI_ALLOW_PRIVATE_ENDPOINTS=true.
 */
export const privateEndpointsAllowed = () => process.env.AI_ALLOW_PRIVATE_ENDPOINTS === "true";

export class BlockedDestinationError extends Error {}

const blocked = (host: string) =>
  new BlockedDestinationError(
    `Tujuan ${host} berada di jaringan privat/lokal dan diblokir. Gunakan endpoint publik, atau minta operator server mengaktifkan AI_ALLOW_PRIVATE_ENDPOINTS untuk self-host.`,
  );

type LookupCallback = (err: Error | null, address?: string | dns.LookupAddress[], family?: number) => void;

/**
 * Lookup DNS yang menolak alamat privat. Dipasang di agent koneksi, jadi pemeriksaan terjadi pada resolusi
 * yang SAMA dengan yang dipakai untuk connect — tidak ada celah DNS rebinding antara "cek" dan "pakai".
 */
function guardedLookup(hostname: string, options: dns.LookupOptions, callback: LookupCallback) {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error);

    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((entry) => isPrivateAddress(entry.address))) {
      return callback(blocked(hostname));
    }

    if (options.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
}

const agent = new Agent({ connect: { lookup: guardedLookup as never } });

/**
 * fetch untuk memanggil endpoint model yang URL-nya diketik user:
 * - menolak hostname/IP literal privat sebelum request (IP literal tidak melewati DNS lookup);
 * - hostname lain divalidasi pada saat connect (lihat guardedLookup);
 * - redirect ditolak, supaya endpoint publik tidak bisa memantulkan request ke jaringan internal.
 */
export const guardedFetch: typeof fetch = async (input, init) => {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const { hostname } = new URL(raw);
  const host = hostname.replace(/^\[|\]$/g, "");

  if (isIP(host) !== 0 ? isPrivateAddress(host) : isPrivateHostname(hostname)) throw blocked(hostname);

  return (await undiciFetch(raw, {
    ...(init as object),
    dispatcher: agent,
    redirect: "error",
  } as never)) as unknown as Response;
};

/** fetch dasar yang dipakai provider, sesuai kebijakan operator. */
export const outboundFetch = (): typeof fetch =>
  privateEndpointsAllowed() ? (input, init) => fetch(input, { ...init, redirect: "error" }) : guardedFetch;
