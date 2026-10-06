import type { QuotationMode } from "@prisma/client";

export const MODES: { value: QuotationMode; label: string; param: string }[] = [
  { value: "DETAILED", label: "Detailed", param: "detailed" },
  { value: "SUMMARY", label: "Summary", param: "summary" },
  { value: "CLIENT_FRIENDLY", label: "Client Friendly", param: "client" },
];
