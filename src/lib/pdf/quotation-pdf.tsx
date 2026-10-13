import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { QuotationMode } from "@prisma/client";

import { formatDate } from "@/lib/format";
import { COMPLEXITY_LABEL, taskTypeLabel } from "@/lib/labels";
import { formatItemPrice, formatTotal, groupByType } from "@/lib/quotation";

export interface PdfQuotation {
  mode: QuotationMode;
  version: number;
  generatedAt: Date;
  total: number;
  totalMax: number | null;
  assumptions: string[];
  exclusions: string[];
  items: {
    id: string;
    name: string;
    type: Parameters<typeof groupByType>[0][number]["type"];
    complexity: keyof typeof COMPLEXITY_LABEL | null;
    breakdown: string[];
    price: number;
    priceMax: number | null;
  }[];
}

export interface PdfBranding {
  companyName: string;
  address: string | null;
  contact: string | null;
  bankInfo: string | null;
  terms: string | null;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a", lineHeight: 1.4 },
  company: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  muted: { color: "#666" },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 20 },
  header: { marginBottom: 14, borderBottom: "1pt solid #ddd", paddingBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottom: "0.5pt solid #eee" },
  rowName: { flex: 1, paddingRight: 12 },
  bold: { fontFamily: "Helvetica-Bold" },
  group: { marginTop: 10, flexDirection: "row", justifyContent: "space-between", fontFamily: "Helvetica-Bold" },
  step: { color: "#666", fontSize: 9, marginTop: 1 },
  total: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, paddingTop: 8, borderTop: "1pt solid #1a1a1a", fontSize: 12, fontFamily: "Helvetica-Bold" },
  section: { marginTop: 16 },
  sectionTitle: { fontFamily: "Helvetica-Bold", marginBottom: 4 },
});

function Bullets({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item}>• {item}</Text>
      ))}
    </View>
  );
}

export function QuotationPdf({
  projectName,
  clientName,
  branding,
  quotation,
}: {
  projectName: string;
  clientName: string | null;
  branding: PdfBranding;
  quotation: PdfQuotation;
}) {
  const clientFriendly = quotation.mode === "CLIENT_FRIENDLY";

  return (
    <Document title={`Penawaran ${projectName}`} author={branding.companyName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.company}>{branding.companyName}</Text>
          {branding.address && <Text style={styles.muted}>{branding.address}</Text>}
          {branding.contact && <Text style={styles.muted}>{branding.contact}</Text>}
        </View>

        <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold" }}>Penawaran Harga</Text>
        <Text style={styles.muted}>
          {projectName}
          {clientName ? ` · untuk ${clientName}` : ""} · versi {quotation.version} ·{" "}
          {formatDate(quotation.generatedAt)}
        </Text>

        <Text style={styles.title}>Rincian Pekerjaan</Text>

        {quotation.mode === "SUMMARY"
          ? groupByType(quotation.items).map((group) => (
              <View key={group.type}>
                <View style={styles.group}>
                  <Text>{group.label}</Text>
                  <Text>{formatItemPrice({ price: group.subtotal, priceMax: group.subtotalMax })}</Text>
                </View>
                {group.items.map((item) => (
                  <View key={item.id} style={styles.row} wrap={false}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text>{formatItemPrice(item)}</Text>
                  </View>
                ))}
              </View>
            ))
          : quotation.items.map((item) => (
              <View key={item.id} style={styles.row} wrap={false}>
                <View style={styles.rowName}>
                  <Text style={styles.bold}>{item.name}</Text>
                  {!clientFriendly && (
                    <>
                      <Text style={styles.step}>
                        {item.type ? taskTypeLabel(item.type) : ""}
                        {item.complexity ? ` · ${COMPLEXITY_LABEL[item.complexity]}` : ""}
                      </Text>
                      {item.breakdown.map((step, index) => (
                        <Text key={step} style={styles.step}>
                          {index + 1}. {step}
                        </Text>
                      ))}
                    </>
                  )}
                </View>
                <Text>{formatItemPrice(item)}</Text>
              </View>
            ))}

        <View style={styles.total} wrap={false}>
          <Text>{clientFriendly ? "Total estimasi biaya" : "Total"}</Text>
          <Text>{formatTotal(quotation)}</Text>
        </View>

        <Bullets title={clientFriendly ? "Yang kami asumsikan" : "Asumsi"} items={quotation.assumptions} />
        <Bullets title={clientFriendly ? "Yang tidak termasuk" : "Pengecualian"} items={quotation.exclusions} />

        {branding.bankInfo && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Pembayaran</Text>
            <Text>{branding.bankInfo}</Text>
          </View>
        )}
        {branding.terms && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Syarat & Ketentuan</Text>
            <Text>{branding.terms}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
