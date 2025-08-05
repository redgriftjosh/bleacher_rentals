import { Tables } from "../../../../../../../database.types";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";
import { Color } from "@/types/Color";
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
});

// Define column widths
const columnWidths = [
  "8%", // Date
  "8%", // Bleacher
  "12%", // Pickup Location
  "8%", // POC at P/U
  "7%", // Pickup Time
  "12%", // Dropoff Location
  "8%", // POC at D/O
  "7%", // Dropoff Time
  "8%", // Pay
  "22%", // Notes
];

type MyDocumentProps = {
  workTrackers: {
    workTracker: Tables<"WorkTrackers">;
    pickup_address: Tables<"Addresses"> | null;
    dropoff_address: Tables<"Addresses"> | null;
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
};

export const MyDocument: React.FC<MyDocumentProps> = ({
  workTrackers,
  header,
  financialTotals,
}) => (
  <Document>
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.table}>
        <View style={styles.headerRow}>
          <Text style={styles.headerText}>{`${header.dateRange} - ${header.driverName}`}</Text>
        </View>
        <Text style={styles.titleText}>{`Bleacher Deliveries/Pickups`}</Text>
        {/* Header */}
        <View style={styles.tableRow}>
          {[
            "Date",
            "Bleacher",
            "Pickup Location",
            "POC at P/U",
            "Time",
            "Dropoff Location",
            "POC at D/O",
            "Time",
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
              {row.workTracker.bleacher_id}
            </Text>
            <Text style={[styles.bodyCell, { width: columnWidths[2] }]}>
              {row.pickup_address?.street ?? ""}
            </Text>
            <Text style={[styles.bodyCell, { width: columnWidths[3] }]}>
              {row.workTracker.pickup_poc}
            </Text>
            <Text style={[styles.bodyCell, { width: columnWidths[4] }]}>
              {row.workTracker.pickup_time}
            </Text>
            <Text style={[styles.bodyCell, { width: columnWidths[5] }]}>
              {row.dropoff_address?.street ?? ""}
            </Text>
            <Text style={[styles.bodyCell, { width: columnWidths[6] }]}>
              {row.workTracker.dropoff_poc}
            </Text>
            <Text style={[styles.bodyCell, { width: columnWidths[7] }]}>
              {row.workTracker.dropoff_time}
            </Text>
            <Text style={[styles.bodyCell, { width: columnWidths[8] }]}>
              {row.workTracker.pay_cents != null
                ? `$${(row.workTracker.pay_cents / 100).toFixed(2)}`
                : ""}
            </Text>
            <Text style={[styles.bodyCell, { width: columnWidths[9] }, styles.lastCell]}>
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
          <Text style={[styles.bodyCell, { width: columnWidths[8] }]}>
            {`$${(financialTotals.subtotal / 100).toFixed(2)}`}
          </Text>
          <Text style={[styles.bodyCell, { width: columnWidths[9] }, styles.lastCell]}></Text>
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
          <Text style={[styles.bodyCell, { width: columnWidths[8] }]}>
            {`$${(financialTotals.tax / 100).toFixed(2)}`}
          </Text>
          <Text style={[styles.bodyCell, { width: columnWidths[9] }, styles.lastCell]}></Text>
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
          <Text style={[styles.bodyCell, { width: columnWidths[8] }]}>
            {`$${(financialTotals.total / 100).toFixed(2)}`}
          </Text>
          <Text style={[styles.bodyCell, { width: columnWidths[9] }, styles.lastCell]}></Text>
        </View>
      </View>
    </Page>
  </Document>
);
