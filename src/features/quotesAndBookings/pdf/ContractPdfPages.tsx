import { Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { QuoteDocumentData } from "./quoteDocumentData";
import { parseHtmlToNodes, type HtmlNode } from "./htmlToNodes";
import { formatQuoteDateTime } from "./quoteFormat";
import { quoteText } from "./quoteStrings";

Font.register({
  family: "DancingScript",
  src: "https://fonts.gstatic.com/s/dancingscript/v29/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSoHTQ.ttf",
});

const DARK_BLUE = "#10365a";
const BORDER_COLOR = "#e5e7eb";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#1f2937",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: DARK_BLUE,
    marginBottom: 16,
    textAlign: "center",
  },
  h2: {
    fontSize: 11,
    fontWeight: "bold",
    color: DARK_BLUE,
    marginTop: 12,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 8.5,
    lineHeight: 1.6,
    marginBottom: 6,
  },
  bold: {
    fontWeight: "bold",
  },
  signatureSection: {
    marginTop: 24,
    borderTopWidth: 2,
    borderTopColor: DARK_BLUE,
    paddingTop: 16,
  },
  signatureTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: DARK_BLUE,
    marginBottom: 16,
  },
  signatureRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  signatureLabel: {
    width: 100,
    fontSize: 9,
    fontWeight: "bold",
    color: "#6b7280",
    paddingTop: 4,
  },
  signatureValue: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 4,
    minHeight: 24,
  },
  signatureText: {
    fontSize: 11,
  },
  signatureCursive: {
    fontSize: 18,
    fontFamily: "DancingScript",
  },
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

function RenderHtmlNodes({ nodes }: { nodes: HtmlNode[] }) {
  return (
    <>
      {nodes.map((node, i) => {
        if (node.type === "h1") {
          return (
            <Text key={i} style={styles.title}>
              {node.text}
            </Text>
          );
        }
        if (node.type === "h2") {
          return (
            <Text key={i} style={styles.h2}>
              {node.text}
            </Text>
          );
        }
        if (node.type === "br") {
          return <Text key={i}>{"\n"}</Text>;
        }
        // paragraph
        return (
          <Text key={i} style={styles.paragraph}>
            {node.children.map((child, j) => {
              if (child.type === "strong") {
                return (
                  <Text key={j} style={styles.bold}>
                    {child.text}
                  </Text>
                );
              }
              if (child.type === "br") {
                return <Text key={j}>{"\n"}</Text>;
              }
              return <Text key={j}>{child.text}</Text>;
            })}
          </Text>
        );
      })}
    </>
  );
}

export function ContractPdfPages({ data }: { data: QuoteDocumentData }) {
  if (!data.termsHtml) return null;

  const nodes = parseHtmlToNodes(data.termsHtml);
  const sig = data.contractSignature;
  const s = quoteText(data.language);

  return (
    <Page size="LETTER" style={styles.page} wrap>
      {/* T&C content */}
      <RenderHtmlNodes nodes={nodes} />

      {/* Signature block */}
      <View style={styles.signatureSection}>
        <View style={styles.signatureRow}>
          <Text style={styles.signatureLabel}>{s.signature}</Text>
          <View style={styles.signatureValue}>
            {sig ? <Text style={styles.signatureCursive}>{sig.signerName}</Text> : null}
          </View>
        </View>

        <View style={styles.signatureRow}>
          <Text style={styles.signatureLabel}>{s.printedName}</Text>
          <View style={styles.signatureValue}>
            {sig ? <Text style={styles.signatureText}>{sig.signerName}</Text> : null}
          </View>
        </View>

        <View style={styles.signatureRow}>
          <Text style={styles.signatureLabel}>{s.signatureDate}</Text>
          <View style={styles.signatureValue}>
            {sig ? (
              <Text style={styles.signatureText}>
                {formatQuoteDateTime(sig.signedAt, data.language)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>{data.company.name}</Text>
        <Text style={styles.footerText}>{data.quoteNumber}</Text>
      </View>
    </Page>
  );
}
