import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { Tables } from "../../../../../database.types";

// ─── Types ────────────────────────────────────────────────────────────────────
export type BOLBleacherData = {
  bleacher_number: number | null;
  bleacher_rows: number | null;
  bleacher_seats: number | null;
  vin_number: string | null;
  hitch_type: string | null;
  manufacturer: string | null;
  gvwr: number | null;
  height_folded_ft: number | null;
  tag_number: string | null;
};

export type BillOfLadingDocumentProps = {
  workTracker: Tables<"WorkTrackers">;
  pickupAddress: Tables<"Addresses"> | null;
  dropoffAddress: Tables<"Addresses"> | null;
  bleacher: BOLBleacherData | null;
  bolNumber: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function v(value: string | number | null | undefined, fallback = ""): string {
  return value !== null && value !== undefined && value !== "" ? String(value) : fallback;
}

function boolLabel(val: boolean | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  return val ? "Yes" : "No";
}

function formatAddress(addr: Tables<"Addresses"> | null): string {
  if (!addr) return "";
  return [addr.street, addr.city, addr.state_province, addr.zip_postal]
    .filter(Boolean)
    .join(", ");
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const DARK_BLUE = "#10365A";
const BORDER = "#000000";

const s = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    flexDirection: "column",
  },

  // ── Header row (logo + title) ──
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  logo: {
    width: 130,
    height: 54,
    objectFit: "contain",
  },
  bolTitle: {
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2,
    color: "#000",
  },

  // ── Generic bordered box ──
  box: {
    border: `1pt solid ${BORDER}`,
    marginBottom: 4,
    padding: "6pt 9pt",
  },

  // ── Two-column row ──
  twoCol: {
    flexDirection: "row",
    border: `1pt solid ${BORDER}`,
    marginBottom: 4,
  },
  col: {
    flex: 1,
    padding: "6pt 9pt",
  },
  colBorder: {
    flex: 1,
    padding: "6pt 9pt",
    borderLeft: `1pt solid ${BORDER}`,
  },

  // ── Text helpers ──
  bold: { fontFamily: "Helvetica-Bold" },
  underline: { textDecoration: "underline" },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    textDecoration: "underline",
    fontSize: 9,
    marginBottom: 4,
  },
  bodyText: { fontSize: 8.5, lineHeight: 1.45, marginBottom: 3 },

  // ── Shipment details grid ──
  shipmentGrid: {
    flexDirection: "row",
    gap: 12,
  },
  shipmentCol: { flex: 1 },
  detailLine: {
    flexDirection: "row",
    marginBottom: 3,
    alignItems: "flex-start",
  },
  detailLabel: { fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  detailVal: { fontSize: 8.5, flex: 1 },

  // ── Pickup / Delivery split panel ──
  pdRow: {
    flexDirection: "row",
    border: `1pt solid ${BORDER}`,
    marginBottom: 4,
    flexGrow: 1,
  },
  pdCol: { flex: 1, padding: "8pt 10pt", flexDirection: "column" },
  pdColBorder: { flex: 1, padding: "8pt 10pt", borderLeft: `1pt solid ${BORDER}`, flexDirection: "column" },
  pdTitle: {
    fontFamily: "Helvetica-Bold",
    textDecoration: "underline",
    textAlign: "center",
    fontSize: 9,
    marginBottom: 8,
  },
  pdLine: {
    flexDirection: "row",
    marginBottom: 0,
    flexGrow: 1,
    alignItems: "flex-start",
  },
  pdLabel: {
    fontFamily: "Helvetica-Bold",
    width: 120,
    flexShrink: 0,
    fontSize: 8.5,
  },
  pdVal: { flex: 1, fontSize: 8.5 },

  // ── Signatures ──
  sigBox: {
    border: `1pt solid ${BORDER}`,
    padding: "8pt 10pt 8pt 10pt",
  },
  sigNote: { fontSize: 9, marginBottom: 10 },
  sigRow: {
    flexDirection: "row",
    marginBottom: 0,
    flexGrow: 1,
    alignItems: "flex-start",
  },
  sigCol: { flex: 1 },
  sigColRight: { flex: 1, paddingLeft: 20 },
  sigLabel: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 20 },
  sigLine: { borderBottom: `1pt solid ${BORDER}`, width: "80%" },

  // ── Bottom logo (small, bottom-right of sig box) ──
  bottomLogo: {
    width: 38,
    height: 22,
    objectFit: "contain",
    alignSelf: "flex-end",
    marginTop: 6,
  },
});

// ─── Document ─────────────────────────────────────────────────────────────────
export const BillOfLadingDocument: React.FC<BillOfLadingDocumentProps> = ({
  workTracker,
  pickupAddress,
  dropoffAddress,
  bleacher,
  bolNumber,
}) => {
  const pickupFull = formatAddress(pickupAddress);
  const dropoffFull = formatAddress(dropoffAddress);

  const seats =
    bleacher?.bleacher_rows && bleacher?.bleacher_seats
      ? `${bleacher.bleacher_rows} rows / ${bleacher.bleacher_seats} seats`
      : bleacher?.bleacher_seats
        ? `${bleacher.bleacher_seats} seats`
        : "";

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Logo + Title ── */}
        <View style={s.headerRow}>
          {/* Use a public path — Next.js serves /icon.png from /src/app/icon.png via public or app dir */}
          <Image style={s.logo} src="/NEW-Bleacher-Rentals-logo.png" />
          <Text style={s.bolTitle}>BILL OF LADING</Text>
        </View>

        {/* ── Project # / BOL # ── */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text>
              <Text style={s.bold}>Project #  </Text>
              <Text>{v(workTracker.project_number)}</Text>
            </Text>
          </View>
          <View style={s.colBorder}>
            <Text>
              <Text style={s.bold}>BOL #  </Text>
              <Text>{bolNumber}</Text>
            </Text>
          </View>
        </View>

        {/* ── Shipper / Contact ── */}
        <View style={s.twoCol}>
          <View style={s.col}>
            <Text style={s.bold}>Shipper:</Text>
            <Text style={s.bold}>Bleacher Rentals Florida LLC</Text>
            <Text>7901 4th St N 25767 St. Petersburg, FL 33702</Text>
          </View>
          <View style={s.colBorder}>
            <Text style={s.bold}>Contact:</Text>
            <Text style={s.bold}>Mike Timmermans</Text>
            <Text>(800) 436-0416</Text>
          </View>
        </View>

        {/* ── Shipment Details ── */}
        <View style={s.box}>
          <Text style={s.sectionTitle}>SHIPMENT DETAILS:</Text>
          <View style={s.shipmentGrid}>
            <View style={s.shipmentCol}>
              <View style={s.detailLine}>
                <Text style={s.detailLabel}>Item being shipped:  </Text>
                <Text style={s.detailVal}>Mobile Bleacher Trailer</Text>
              </View>
              <View style={s.detailLine}>
                <Text style={s.detailLabel}>Unit Number:  </Text>
                <Text style={s.detailVal}>{v(bleacher?.bleacher_number)}</Text>
                <Text style={[s.detailLabel, { marginLeft: 10 }]}>Size / Seats:  </Text>
                <Text style={s.detailVal}>{seats}</Text>
              </View>
              <View style={s.detailLine}>
                <Text style={s.detailLabel}>Hitch Type:  </Text>
                <Text style={s.detailVal}>{v(bleacher?.hitch_type)}</Text>
              </View>
              <View style={s.detailLine}>
                <Text style={s.detailLabel}>GVWR:  </Text>
                <Text style={s.detailVal}>
                  {bleacher?.gvwr != null ? `${bleacher.gvwr} lbs` : ""}
                </Text>
              </View>
              <View style={s.detailLine}>
                <Text style={s.detailLabel}>Notes:  </Text>
                <Text style={s.detailVal}>Power Only      Flatbed</Text>
              </View>
            </View>
            <View style={s.shipmentCol}>
              <View style={s.detailLine}>
                <Text style={s.detailLabel}>Quantity:  </Text>
                <Text style={s.detailVal}>1</Text>
              </View>
              <View style={s.detailLine}>
                <Text style={s.detailLabel}>VIN:  </Text>
                <Text style={s.detailVal}>{v(bleacher?.vin_number)}</Text>
              </View>
              <View style={s.detailLine}>
                <Text style={s.detailLabel}>Manufacturer:  </Text>
                <Text style={s.detailVal}>{v(bleacher?.manufacturer)}</Text>
              </View>
              <View style={s.detailLine}>
                <Text style={s.detailLabel}>Height of Folded Unit:  </Text>
                <Text style={s.detailVal}>
                  {bleacher?.height_folded_ft != null ? `${bleacher.height_folded_ft} ft` : ""}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Carrier / Payment Terms ── */}
        <View style={s.box}>
          <Text style={s.sectionTitle}>CARRIER:</Text>
          <Text style={s.bodyText}>
            Carrier Liability agreed to a minimum of $100,000.00 cargo or equal to load declared
            value (whichever is greater). Load Declared value will not exceed $100,000 unless
            specified here: Actual load declared value is:
          </Text>
          <Text style={s.sectionTitle}>PAYMENT TERMS:</Text>
          <Text style={s.bodyText}>
            Payment to the driver shall be made only upon the successful delivery and acceptance of
            the trailer unit(s) by the consignee. The consignee's signature on the bill of lading
            shall serve as confirmation that the unit has been received in acceptable condition.
          </Text>
          <Text style={s.bodyText}>
            Any discrepancies or damages noted at delivery must be documented and communicated
            immediately.
          </Text>
        </View>

        {/* ── Pickup / Delivery ── */}
        <View style={s.pdRow}>
          <View style={s.pdCol}>
            <Text style={s.pdTitle}>PICKUP INFORMATION (Trailer Origin)</Text>
            <View style={s.pdLine}>
              <Text style={s.pdLabel}>Pick up date:</Text>
              <Text style={s.pdVal}>{v(workTracker.date)}</Text>
            </View>
            <View style={s.pdLine}>
              <Text style={s.pdLabel}>Pick up time:</Text>
              <Text style={s.pdVal}>{v(workTracker.pickup_time)}</Text>
            </View>
            <View style={s.pdLine}>
              <Text style={s.pdLabel}>Pick up address:</Text>
              <Text style={s.pdVal}>{pickupFull}</Text>
            </View>
            <View style={s.pdLine}>
              <Text style={s.pdLabel}>On site POC at pick up:</Text>
              <Text style={s.pdVal}>{v(workTracker.pickup_poc)}</Text>
            </View>
            <View style={s.pdLine}>
              <Text style={s.pdLabel}>Tear Down Required:</Text>
              <Text style={s.pdVal}>{boolLabel(workTracker.teardown_required)}</Text>
            </View>
            <View style={s.pdLine}>
              <Text style={s.pdLabel}>Pick up Instructions:</Text>
              <Text style={s.pdVal}>{v(workTracker.pickup_instructions)}</Text>
            </View>
          </View>
          <View style={s.pdColBorder}>
            <Text style={s.pdTitle}>DELIVERY INFORMATION (Trailer Destination)</Text>
            <View style={s.pdLine}>
              <Text style={s.pdLabel}>Delivery date:</Text>
              <Text style={s.pdVal}>{v(workTracker.date)}</Text>
            </View>
            <View style={s.pdLine}>
              <Text style={s.pdLabel}>Delivery time:</Text>
              <Text style={s.pdVal}>{v(workTracker.dropoff_time)}</Text>
            </View>
            <View style={s.pdLine}>
              <Text style={s.pdLabel}>Delivery address:</Text>
              <Text style={s.pdVal}>{dropoffFull}</Text>
            </View>
            <View style={s.pdLine}>
              <Text style={s.pdLabel}>On site POC at delivery (Consignee):</Text>
              <Text style={s.pdVal}>{v(workTracker.dropoff_poc)}</Text>
            </View>
            <View style={s.pdLine}>
              <Text style={s.pdLabel}>Set Up Required:</Text>
              <Text style={s.pdVal}>{boolLabel(workTracker.setup_required)}</Text>
            </View>
            <View style={s.pdLine}>
              <Text style={s.pdLabel}>Delivery Instructions:</Text>
              <Text style={s.pdVal}>{v(workTracker.dropoff_instructions)}</Text>
            </View>
          </View>
        </View>

        {/* ── Signatures ── */}
        <View style={s.sigBox}>
          <Text style={s.sigNote}>
            <Text style={s.bold}>Signatures  </Text>
            (Please sign when the unit is dropped off at the destination.)
          </Text>
          <View style={s.sigRow}>
            <View style={s.sigCol}>
              <Text style={s.sigLabel}>Carrier:</Text>
              <View style={s.sigLine} />
            </View>
            <View style={s.sigColRight}>
              <Text style={s.sigLabel}>Date:</Text>
              <View style={s.sigLine} />
            </View>
          </View>
          <View style={[s.sigRow, { marginTop: 16 }]}>
            <View style={s.sigCol}>
              <Text style={s.sigLabel}>Consignee:</Text>
              <View style={s.sigLine} />
            </View>
            <View style={s.sigColRight}>
              <Text style={s.sigLabel}>Date:</Text>
              <View style={s.sigLine} />
            </View>
          </View>
          <Image style={s.bottomLogo} src="/NEW-Bleacher-Rentals-logo.png" />
        </View>

      </Page>
    </Document>
  );
};