import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import { QuoteDocumentData } from "./quoteDocumentData";
import { ContractPdfPages } from "./ContractPdfPages";

const DARK_BLUE = "#10365a";
const LIGHT_GRAY = "#f3f4f6";
const BORDER_COLOR = "#e5e7eb";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#1f2937",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: DARK_BLUE,
    paddingBottom: 12,
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: DARK_BLUE,
  },
  quoteTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: DARK_BLUE,
    textAlign: "right",
  },
  quoteNumber: {
    fontSize: 9,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 2,
  },

  // Info blocks
  infoRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 16,
  },
  infoBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 7,
    fontWeight: "bold",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 9,
    lineHeight: 1.4,
  },
  infoBold: {
    fontSize: 9,
    fontWeight: "bold",
  },

  // Dates
  datesRow: {
    flexDirection: "row",
    backgroundColor: LIGHT_GRAY,
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
    gap: 16,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 7,
    color: "#6b7280",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  dateValue: {
    fontSize: 9,
    fontWeight: "bold",
    marginTop: 2,
  },

  // Table
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: DARK_BLUE,
    borderRadius: 2,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRowAlt: {
    backgroundColor: "#fafafa",
  },
  cellItem: { flex: 3 },
  cellQty: { width: 40, textAlign: "center" },
  cellPrice: { width: 70, textAlign: "right" },
  cellTotal: { width: 70, textAlign: "right", fontWeight: "bold" },

  // Totals
  totalsBlock: {
    alignItems: "flex-end",
    marginBottom: 20,
  },
  totalsRow: {
    flexDirection: "row",
    width: 200,
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalsDivider: {
    borderTopWidth: 1,
    borderTopColor: DARK_BLUE,
    marginVertical: 4,
    width: 200,
  },
  totalsLabel: {
    fontSize: 9,
  },
  totalsValue: {
    fontSize: 9,
    fontWeight: "bold",
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: DARK_BLUE,
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: DARK_BLUE,
  },

  // Payment schedule
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: DARK_BLUE,
    marginBottom: 8,
    marginTop: 12,
  },

  // Notes
  notesText: {
    fontSize: 8,
    color: "#6b7280",
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7,
    color: "#9ca3af",
  },
});

function formatMoney(cents: number, currency: "USD" | "CAD"): string {
  const symbol = "$";
  const abs = Math.abs(cents);
  const formatted = (abs / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return cents < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
}

function formatDate(d: string): string {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function QuotePdfDocument({ data }: { data: QuoteDocumentData }) {
  const { currency } = data;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{data.company.name}</Text>
            {data.company.street ? (
              <Text style={styles.infoText}>
                {data.company.street}
                {"\n"}
                {data.company.city}, {data.company.state} {data.company.zip}
              </Text>
            ) : null}
          </View>
          <View>
            <Text style={styles.quoteTitle}>QUOTE</Text>
            <Text style={styles.quoteNumber}>{data.quoteNumber}</Text>
            <Text style={styles.quoteNumber}>Date: {formatDate(data.quoteDate)}</Text>
            {data.validUntil ? (
              <Text style={styles.quoteNumber}>Valid until: {formatDate(data.validUntil)}</Text>
            ) : null}
          </View>
        </View>

        {/* Contact + Venue */}
        <View style={styles.infoRow}>
          {data.contact && (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Bill To</Text>
              <Text style={styles.infoBold}>{data.contact.name}</Text>
              {data.contact.email ? (
                <Text style={styles.infoText}>{data.contact.email}</Text>
              ) : null}
              {data.contact.phone ? (
                <Text style={styles.infoText}>{data.contact.phone}</Text>
              ) : null}
            </View>
          )}
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Event Venue</Text>
            <Text style={styles.infoBold}>{data.venue.name}</Text>
            {data.venue.street ? (
              <Text style={styles.infoText}>
                {data.venue.street} {data.venue.zip}
              </Text>
            ) : null}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Account Manager</Text>
            <Text style={styles.infoBold}>{data.accountManager || "—"}</Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.datesRow}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Event Start</Text>
            <Text style={styles.dateValue}>{formatDate(data.dates.eventStart)}</Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Event End</Text>
            <Text style={styles.dateValue}>{formatDate(data.dates.eventEnd)}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.cellItem]}>Item</Text>
            <Text style={[styles.tableHeaderText, styles.cellQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.cellPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderText, styles.cellTotal]}>Total</Text>
          </View>
          {data.lineItems.map((item, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <View style={styles.cellItem}>
                <Text style={{ fontWeight: "bold" }}>{item.label}</Text>
                {item.description ? (
                  <Text style={{ color: "#6b7280", fontSize: 8, marginTop: 1 }}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.cellQty}>{item.qty}</Text>
              <Text style={styles.cellPrice}>{formatMoney(item.unitPrice, currency)}</Text>
              <Text style={styles.cellTotal}>{formatMoney(item.total, currency)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatMoney(data.subtotalCents, currency)}</Text>
          </View>
          {data.discountsCents !== 0 && (
            <>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discounts</Text>
                <Text style={[styles.totalsValue, { color: "#dc2626" }]}>
                  {formatMoney(data.discountsCents, currency)}
                </Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Subtotal After Discount</Text>
                <Text style={styles.totalsValue}>
                  {formatMoney(data.subtotalCents + data.discountsCents, currency)}
                </Text>
              </View>
            </>
          )}
          {data.taxAmountCents !== 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>
                Tax{data.taxPercent ? ` (${data.taxPercent}%)` : ""}
              </Text>
              <Text style={styles.totalsValue}>{formatMoney(data.taxAmountCents, currency)}</Text>
            </View>
          )}
          <View style={styles.totalsDivider} />
          <View style={styles.totalsRow}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>{formatMoney(data.totalCents, currency)}</Text>
          </View>
        </View>

        {/* Payment Schedule */}
        {data.paymentSchedule.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Payment Schedule</Text>
            {data.paymentSchedule.map((p, i) => (
              <View key={i} style={[styles.tableRow, { paddingHorizontal: 0 }]}>
                <Text style={{ flex: 1 }}>{formatDate(p.dueDate)}</Text>
                <Text style={{ width: 80, textAlign: "right" }}>
                  {formatMoney(p.amountCents, currency)}
                </Text>
                <Text
                  style={{
                    width: 60,
                    textAlign: "right",
                    color: p.status === "paid" ? "#16a34a" : "#6b7280",
                  }}
                >
                  {p.status}
                </Text>
              </View>
            ))}
          </>
        )}

        {/* Notes */}
        {data.clientNotes ? (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{data.clientNotes}</Text>
          </>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{data.company.name}</Text>
          <Text style={styles.footerText}>{data.quoteNumber}</Text>
        </View>
      </Page>

      {/* Contract pages (T&C + signature) */}
      <ContractPdfPages data={data} />
    </Document>
  );
}
