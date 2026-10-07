import { describe, expect, it } from "vitest";

import { isPrivateAddress, isPrivateHostname } from "./net";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1", "127.255.255.254", "10.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254",
    "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "198.18.0.1", "192.0.2.5",
  ])("IPv4 privat/khusus: %s", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(["8.8.8.8", "1.1.1.1", "172.15.255.255", "172.32.0.1", "100.63.255.255", "100.128.0.1", "93.184.216.34"])(
    "IPv4 publik: %s",
    (ip) => expect(isPrivateAddress(ip)).toBe(false),
  );

  it.each([
    "::1", "::", "[::1]", "fd00::1", "fc00::abcd", "fe80::1", "fe80::1%eth0", "ff02::1", "2001:db8::1",
    "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.1.2.3", "::ffff:a9fe:a9fe", "64:ff9b::7f00:1", "2002:7f00:1::", "2002:c0a8:101::",
  ])("IPv6 privat/khusus (termasuk bentuk IPv4 tertanam): %s", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(["2606:4700:4700::1111", "2001:4860:4860::8888", "::ffff:8.8.8.8", "2002:0808:0808::"])(
    "IPv6 publik: %s",
    (ip) => expect(isPrivateAddress(ip)).toBe(false),
  );

  it("string yang bukan IP dianggap tidak aman", () => {
    expect(isPrivateAddress("bukan-ip")).toBe(true);
    expect(isPrivateAddress("1.2.3")).toBe(true);
  });
});

describe("isPrivateHostname", () => {
  it.each(["localhost", "foo.localhost", "printer.local", "db.internal", "nas.lan", "ollama", "intranet", "127.0.0.1", "[::1]", "localhost."])(
    "privat: %s",
    (host) => expect(isPrivateHostname(host)).toBe(true),
  );

  it.each(["api.openai.com", "ollama.contoh.com", "8.8.8.8"])("publik: %s", (host) =>
    expect(isPrivateHostname(host)).toBe(false),
  );
});
