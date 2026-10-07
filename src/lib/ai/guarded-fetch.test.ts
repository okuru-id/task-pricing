import dns from "node:dns";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { BlockedDestinationError, guardedFetch, outboundFetch } from "./guarded-fetch";

let server: Server;
let port: number;
let hits = 0;

beforeAll(async () => {
  server = createServer((req, res) => {
    hits++;
    if (req.url === "/redirect") {
      res.writeHead(302, { Location: "http://169.254.169.254/latest/meta-data" }).end();
    } else {
      res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.AI_ALLOW_PRIVATE_ENDPOINTS;
  hits = 0;
});

/** undici membungkus kegagalan lookup sebagai TypeError("fetch failed") dengan penyebab asli di `cause`. */
const causeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return (error as { cause?: unknown }).cause;
  }
  throw new Error("fetch seharusnya gagal");
};

describe("guardedFetch (kebijakan default: blokir jaringan privat)", () => {
  it("menolak IP literal dan nama lokal tanpa membuat koneksi", async () => {
    await expect(guardedFetch(`http://127.0.0.1:${port}/`)).rejects.toThrow(BlockedDestinationError);
    await expect(guardedFetch(`http://localhost:${port}/`)).rejects.toThrow(BlockedDestinationError);
    await expect(guardedFetch("http://169.254.169.254/latest")).rejects.toThrow(BlockedDestinationError);
    await expect(guardedFetch(`http://[::1]:${port}/`)).rejects.toThrow(BlockedDestinationError);
    expect(hits).toBe(0);
  });

  it("DNS rebinding: hostname 'publik' yang ter-resolve ke alamat privat ditolak saat connect", async () => {
    const real = dns.lookup;
    vi.spyOn(dns, "lookup").mockImplementation(((host: string, options: unknown, cb: unknown) => {
      if (host === "rebind.contoh.com") {
        const callback = cb as (e: Error | null, a: dns.LookupAddress[]) => void;
        return callback(null, [{ address: "127.0.0.1", family: 4 }]);
      }
      return (real as (...args: unknown[]) => void)(host, options, cb);
    }) as typeof dns.lookup);

    expect(await causeOf(guardedFetch(`http://rebind.contoh.com:${port}/`))).toBeInstanceOf(BlockedDestinationError);
    expect(hits).toBe(0);
  });

  it("salah satu dari beberapa alamat hasil DNS privat → ditolak seluruhnya", async () => {
    vi.spyOn(dns, "lookup").mockImplementation(((_h: string, _o: unknown, cb: unknown) =>
      (cb as (e: Error | null, a: dns.LookupAddress[]) => void)(null, [
        { address: "93.184.216.34", family: 4 },
        { address: "10.0.0.7", family: 4 },
      ])) as typeof dns.lookup);

    expect(await causeOf(guardedFetch(`http://campuran.contoh.com:${port}/`))).toBeInstanceOf(BlockedDestinationError);
    expect(hits).toBe(0);
  });

  it("outboundFetch memakai guardedFetch kecuali operator mengizinkan jaringan privat", async () => {
    await expect(outboundFetch()(`http://127.0.0.1:${port}/`)).rejects.toThrow(BlockedDestinationError);

    process.env.AI_ALLOW_PRIVATE_ENDPOINTS = "true";
    const response = await outboundFetch()(`http://127.0.0.1:${port}/`);
    expect(await response.json()).toEqual({ ok: true });
    expect(hits).toBe(1);
  });

  it("redirect tidak pernah diikuti (self-host sekalipun)", async () => {
    process.env.AI_ALLOW_PRIVATE_ENDPOINTS = "true";
    const cause = await causeOf(outboundFetch()(`http://127.0.0.1:${port}/redirect`));
    expect(String((cause as Error)?.message ?? cause)).toMatch(/redirect/i);
    expect(hits).toBe(1); // hanya request awal; Location tidak diikuti
  });
});
