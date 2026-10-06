import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { NextRequest } from "next/server";
import { createElement, type ReactElement } from "react";

import { getLatestQuotation } from "@/lib/data/quotation";
import { QuotationPdf } from "@/lib/pdf/quotation-pdf";
import { requireScope } from "@/lib/workspace";

import { MODES } from "../modes";

export const runtime = "nodejs";

export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { workspaceId } = await requireScope();
  const { id } = await ctx.params;

  const found = await getLatestQuotation(id, workspaceId);
  if (!found?.quotation) return new Response("Penawaran tidak ditemukan", { status: 404 });

  const { project, quotation } = found;
  const modeParam = request.nextUrl.searchParams.get("mode");
  const mode = MODES.find((m) => m.param === modeParam)?.value ?? "DETAILED";

  // renderToBuffer mengetik argumennya sebagai <Document>, padahal komponen pembungkus pun valid.
  const buffer = await renderToBuffer(
    createElement(QuotationPdf, {
      projectName: project.name,
      clientName: project.clientName,
      branding: {
        companyName: project.workspace.companyName ?? project.workspace.name,
        address: project.workspace.address,
        contact: project.workspace.contact,
        bankInfo: project.workspace.bankInfo,
        terms: project.workspace.terms,
      },
      quotation: { ...quotation, mode },
    }) as unknown as ReactElement<DocumentProps>,
  );

  const filename = `penawaran-${project.name}-v${quotation.version}.pdf`.replace(/[^\w.-]+/g, "-");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
