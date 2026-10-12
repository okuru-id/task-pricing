"use client";

/**
 * Lapis terakhir: error di root layout terjadi sebelum `error.tsx` bisa dipakai,
 * jadi file ini harus membawa <html>/<body> sendiri dan tidak boleh bergantung
 * pada provider, font, atau komponen apa pun yang mungkin ikut gagal.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "system-ui, sans-serif",
          background: "#fff",
          color: "#111",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Aplikasi gagal dimuat</h1>
          <p style={{ fontSize: 13, color: "#555", margin: "0 0 20px", lineHeight: 1.6 }}>
            Terjadi kegagalan sebelum halaman bisa ditampilkan. Coba muat ulang; kalau tetap
            terjadi, periksa log server.
          </p>
          <button
            onClick={reset}
            style={{
              height: 40,
              padding: "0 20px",
              fontSize: 14,
              fontWeight: 500,
              color: "#fff",
              background: "#4f46e5",
              border: 0,
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Coba lagi
          </button>
          {error.digest && (
            <p style={{ fontSize: 12, color: "#777", marginTop: 16 }}>
              Kode kejadian: <code>{error.digest}</code>
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
