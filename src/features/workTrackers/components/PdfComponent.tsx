import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import { Color } from "@/types/Color";
import { Tables } from "../../../../database.types";
import { DriverHeaderInfo } from "../db/db";
import { formatDriveTime, formatMileage, formatWorkTrackerTime } from "../util";
const darkBlue = Color.DARK_BLUE;

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 8,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  table: {
    width: "auto",
    borderTopStyle: "solid",
    borderTopWidth: 1,
    borderRightStyle: "solid",
    borderRightWidth: 1,
    borderLeftStyle: "solid",
    borderLeftWidth: 1,
    borderColor: "#e5e7eb", // gray-200
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
  },
  headerCell: {
    backgroundColor: "#f3f4f6", // gray-100
    fontWeight: "bold",
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    textAlign: "center",
  },
  bodyCell: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    textAlign: "center",
  },
  bodyCellBold: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    textAlign: "center",
    fontWeight: "bold",
  },
  lastCell: {
    borderRightWidth: 0,
  },
  headerRow: {
    backgroundColor: Color.DARK_BLUE,
    padding: 2,
    // borderRadius: 4,
    // marginBottom: 6,
  },
  headerText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
  },
  titleText: {
    fontSize: 10,
    fontStyle: "italic",
    fontWeight: "bold",
    // underline
    textDecoration: "underline",
  },
  infoSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  infoItem: {
    fontSize: 8,
    marginRight: 12,
  },
  infoLabel: {
    fontWeight: "bold",
  },
});

// Define column widths
const columnWidths = [
  "8%", // Date
  "7%", // Bleacher
  "7%", // Activity Type
  "10%", // Pickup Location
  "6%", // POC at P/U
  "6%", // Pickup Time
  "10%", // Dropoff Location
  "6%", // POC at D/O
  "6%", // Dropoff Time
  "6%", // Drive Time
  "7%", // Milage
  "7%", // Pay
  "14%", // Notes
];

type MyDocumentProps = {
  workTrackers: {
    workTracker: Tables<"WorkTrackers">;
    pickup_address: Tables<"Addresses"> | null;
    dropoff_address: Tables<"Addresses"> | null;
    bleacherNumber: number | null;
    activityType: string | null;
  }[];
  header: {
    dateRange: string;
    driverName: string;
  };
  financialTotals: {
    subtotal: number;
    tax: number;
    taxPercent: number;
    total: number;
  };
  travelTotals: {
    totalDistanceMeters: number;
    totalDriveMinutes: number;
  };
  driverHeaderInfo: DriverHeaderInfo;
};

export const MyDocument: React.FC<MyDocumentProps> = ({
  workTrackers,
  header,
  financialTotals,
  travelTotals,
  driverHeaderInfo,
}) => {
  const { vendor, address, driverPhone, driverEmail } = driverHeaderInfo;
  const formattedAddress = address
    ? [address.street, address.city, address.state_province, address.zip_postal]
        .filter(Boolean)
        .join(", ")
    : null;
  const formattedEin = vendor?.ein ? `${vendor.ein.slice(0, 2)}-${vendor.ein.slice(2)}` : null;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.table}>
          <View style={styles.headerRow}>
            <Text style={styles.headerText}>{`${header.dateRange} - ${header.driverName}`}</Text>
          </View>
          <Text style={styles.titleText}>{`Bleacher Deliveries/Pickups`}</Text>
          <View style={styles.infoSection}>
            {vendor && (
              <Text style={styles.infoItem}>
                <Text style={styles.infoLabel}>Vendor: </Text>
                {vendor.display_name}
              </Text>
            )}
            {formattedAddress && (
              <Text style={styles.infoItem}>
                <Text style={styles.infoLabel}>Address: </Text>
                {formattedAddress}
              </Text>
            )}
            {formattedEin && (
              <Text style={styles.infoItem}>
                <Text style={styles.infoLabel}>EIN: </Text>
                {formattedEin}
              </Text>
            )}
            {vendor?.hst && (
              <Text style={styles.infoItem}>
                <Text style={styles.infoLabel}>HST: </Text>
                {vendor.hst}
              </Text>
            )}
            {driverPhone && (
              <Text style={styles.infoItem}>
                <Text style={styles.infoLabel}>Phone: </Text>
                {driverPhone}
              </Text>
            )}
            {driverEmail && (
              <Text style={styles.infoItem}>
                <Text style={styles.infoLabel}>Email: </Text>
                {driverEmail}
              </Text>
            )}
          </View>
          {/* Header */}
          <View style={styles.tableRow}>
            {[
              "Date",
              "Bleacher",
              "Activity Type",
              "Pickup Location",
              "POC at P/U",
              "Time",
              "Dropoff Location",
              "POC at D/O",
              "Time",
              "Drive Time",
              "Milage",
              "Pay",
              "Notes",
            ].map((label, index) => (
              <Text
                key={index}
                style={[
                  styles.headerCell,
                  { width: columnWidths[index] },
                  ...(index === columnWidths.length - 1 ? [styles.lastCell] : []),
                ]}
              >
                {label}
              </Text>
            ))}
          </View>

          {/* Body Rows */}
          {workTrackers.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.tableRow}>
              <Text style={[styles.bodyCell, { width: columnWidths[0] }]}>
                {row.workTracker.date}
              </Text>
              <Text style={[styles.bodyCell, { width: columnWidths[1] }]}>
                {row.bleacherNumber ?? ""}
              </Text>
              <Text style={[styles.bodyCell, { width: columnWidths[2] }]}>
                {row.activityType ?? ""}
              </Text>
              <Text style={[styles.bodyCell, { width: columnWidths[3] }]}>
                {row.pickup_address?.street ?? ""}
              </Text>
              <Text style={[styles.bodyCell, { width: columnWidths[4] }]}>
                {row.workTracker.pickup_poc}
              </Text>
              <Text style={[styles.bodyCell, { width: columnWidths[5] }]}>
                {formatWorkTrackerTime(
                  row.workTracker.pickup_time_mode,
                  row.workTracker.pickup_time_start,
                  row.workTracker.pickup_time_end,
                )}
              </Text>
              <Text style={[styles.bodyCell, { width: columnWidths[6] }]}>
                {row.dropoff_address?.street ?? ""}
              </Text>
              <Text style={[styles.bodyCell, { width: columnWidths[7] }]}>
                {row.workTracker.dropoff_poc}
              </Text>
              <Text style={[styles.bodyCell, { width: columnWidths[8] }]}>
                {formatWorkTrackerTime(
                  row.workTracker.dropoff_time_mode,
                  row.workTracker.dropoff_time_start,
                  row.workTracker.dropoff_time_end,
                )}
              </Text>
              <Text style={[styles.bodyCell, { width: columnWidths[9] }]}>
                {formatDriveTime(row.workTracker.drive_minutes)}
              </Text>
              <Text style={[styles.bodyCell, { width: columnWidths[10] }]}>
                {formatMileage(row.workTracker.distance_meters)}
              </Text>
              <Text style={[styles.bodyCell, { width: columnWidths[11] }]}>
                {row.workTracker.pay_cents != null
                  ? `$${(row.workTracker.pay_cents / 100).toFixed(2)}`
                  : ""}
              </Text>
              <Text style={[styles.bodyCell, { width: columnWidths[12] }, styles.lastCell]}>
                {row.workTracker.notes}
              </Text>
            </View>
          ))}
          {/* SubTotal row */}
          <View style={styles.tableRow}>
            <Text style={[styles.bodyCellBold, { width: columnWidths[0] }]}>SubTotal</Text>
            <Text style={[styles.bodyCell, { width: columnWidths[1] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[2] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[3] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[4] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[5] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[6] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[7] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[8] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[9] }]}>
              {formatDriveTime(travelTotals.totalDriveMinutes)}
            </Text>
            <Text style={[styles.bodyCell, { width: columnWidths[10] }]}>
              {formatMileage(travelTotals.totalDistanceMeters)}
            </Text>
            <Text style={[styles.bodyCell, { width: columnWidths[11] }]}>
              {`$${(financialTotals.subtotal / 100).toFixed(2)}`}
            </Text>
            <Text style={[styles.bodyCell, { width: columnWidths[12] }, styles.lastCell]}></Text>
          </View>
          {/* HST row */}
          <View style={styles.tableRow}>
            <Text
              style={[styles.bodyCellBold, { width: columnWidths[0] }]}
            >{`HST (${financialTotals.taxPercent}%)`}</Text>
            <Text style={[styles.bodyCell, { width: columnWidths[1] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[2] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[3] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[4] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[5] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[6] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[7] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[8] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[9] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[10] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[11] }]}>
              {`$${(financialTotals.tax / 100).toFixed(2)}`}
            </Text>
            <Text style={[styles.bodyCell, { width: columnWidths[12] }, styles.lastCell]}></Text>
          </View>
          {/* Total row */}
          <View style={styles.tableRow}>
            <Text style={[styles.bodyCellBold, { width: columnWidths[0] }]}>
              Total Amount to be Paid
            </Text>
            <Text style={[styles.bodyCell, { width: columnWidths[1] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[2] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[3] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[4] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[5] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[6] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[7] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[8] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[9] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[10] }]}></Text>
            <Text style={[styles.bodyCell, { width: columnWidths[11] }]}>
              {`$${(financialTotals.total / 100).toFixed(2)}`}
            </Text>
            <Text style={[styles.bodyCell, { width: columnWidths[12] }, styles.lastCell]}></Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
