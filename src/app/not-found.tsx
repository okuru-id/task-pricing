import Link from "next/link";
import { FileQuestion } from "lucide-react";

/** Dipakai juga oleh `notFound()` di loader data, mis. project milik workspace lain (§4). */
export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5 text-center">
        <div className="bg-muted mx-auto flex size-12 items-center justify-center rounded-full">
          <FileQuestion className="text-muted-foreground size-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold">Halaman tidak ditemukan</h1>
          <p className="text-muted-foreground text-[13px]">
            Alamatnya mungkin salah, atau datanya sudah dihapus. Project milik workspace lain
            juga tampil seperti ini.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium"
        >
          Ke Dashboard
        </Link>
      </div>
    </main>
  );
}
