import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/orders/status-machine";
import path from "path";

Font.register({
  family: "Alef",
  fonts: [
    {
      src: path.resolve(process.cwd(), "public", "fonts", "alef-400.ttf"),
      fontWeight: 400,
    },
    {
      src: path.resolve(process.cwd(), "public", "fonts", "alef-700.ttf"),
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "Alef",
    direction: "rtl",
    padding: 40,
    fontSize: 11,
    color: "#1a1a1a",
    textAlign: "right",
  },
  header: {
    backgroundColor: "#1a73e8",
    padding: 20,
    marginBottom: 20,
    borderRadius: 6,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "right",
  },
  headerSub: {
    color: "#e0eaff",
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
    padding: 14,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1a73e8",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  rowLabel: { color: "#666", fontSize: 10, textAlign: "right", flex: 1 },
  rowValue: { fontSize: 10, fontWeight: "bold", textAlign: "left", flex: 2 },
  table: { marginTop: 8 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1a73e8",
    padding: 6,
    borderRadius: 4,
  },
  tableHeaderCell: { color: "#fff", fontSize: 9, flex: 1, textAlign: "right" },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tableCell: { fontSize: 9, flex: 1, textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#e8f0fe",
    borderRadius: 4,
    marginTop: 4,
  },
  totalLabel: { fontWeight: "bold", fontSize: 11, flex: 3, textAlign: "right" },
  totalValue: { fontWeight: "bold", fontSize: 11, color: "#1a73e8", textAlign: "left", flex: 1 },
  footer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#fff3cd",
    borderRadius: 6,
    fontSize: 9,
    color: "#856404",
    textAlign: "right",
  },
  paymentBox: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1a73e8",
    borderRadius: 6,
    textAlign: "right",
  },
});

export async function generateOrderPdf(orderId: string): Promise<Buffer> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      organization: true,
      orderWindow: true,
      requester: { select: { fullName: true, email: true } },
      signatory: { select: { fullName: true } },
      adminReviewedBy: { select: { fullName: true } },
      items: { include: { cardType: true } },
    },
  });

  if (!order) throw new Error("Order not found");

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>משקי דן – הזמנת תווי שי</Text>
          <Text style={styles.headerSub}>
            {order.orderNumber} | {formatDate(order.createdAt)}
          </Text>
        </View>

        {/* Order details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פרטי הזמנה</Text>
          <View style={styles.row}>
            <Text style={styles.rowValue}>{order.organization.name}</Text>
            <Text style={styles.rowLabel}>ארגון</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowValue}>{order.orderWindow.name}</Text>
            <Text style={styles.rowLabel}>חלון הזמנות</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowValue}>{formatDate(order.orderWindow.deliveryDate)}</Text>
            <Text style={styles.rowLabel}>תאריך אספקה</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowValue}>{STATUS_LABELS[order.status]}</Text>
            <Text style={styles.rowLabel}>סטטוס</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowValue}>{order.requester.fullName}</Text>
            <Text style={styles.rowLabel}>מגיש ההזמנה</Text>
          </View>
          {order.signatory && (
            <View style={styles.row}>
              <Text style={styles.rowValue}>{order.signatory.fullName}</Text>
              <Text style={styles.rowLabel}>מורשה חתימה</Text>
            </View>
          )}
        </View>

        {/* Items table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פירוט הזמנה</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { textAlign: "left" }]}>לתשלום</Text>
              <Text style={styles.tableHeaderCell}>הנחה</Text>
              <Text style={styles.tableHeaderCell}>טעינה לכרטיס</Text>
              <Text style={styles.tableHeaderCell}>כמות</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>סוג כרטיס</Text>
            </View>
            {order.items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { textAlign: "left" }]}>{formatCurrency(Number(item.payableTotal))}</Text>
                <Text style={styles.tableCell}>{Number(item.discountPct)}%</Text>
                <Text style={styles.tableCell}>{formatCurrency(Number(item.loadAmount))}</Text>
                <Text style={styles.tableCell}>{item.quantity}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{item.cardType.nameHe}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalValue}>{formatCurrency(Number(order.totalPayable))}</Text>
              <Text style={styles.totalLabel}>סה״כ ({order.totalCards} כרטיסים)</Text>
            </View>
          </View>
        </View>

        {/* Payment details */}
        <View style={styles.paymentBox}>
          <Text style={{ ...styles.sectionTitle, marginBottom: 6 }}>פרטי תשלום</Text>
          <Text style={{ fontSize: 10, lineHeight: 1.6 }}>בנק הפועלים (12) | סניף 412 | חשבון 697890</Text>
          <Text style={{ fontSize: 10, lineHeight: 1.6 }}>שם החשבון: משקי הדרום אשראי ורכישות</Text>
          <Text style={{ fontSize: 10, lineHeight: 1.6 }}>לתשלום: {formatCurrency(Number(order.totalPayable))}</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>שליחת הזמנה זו מהווה הרשאה לחיוב חשבון הארגון. לא תתאפשר החזרת כרטיסים.</Text>
          <Text>לשאלות: נועה 08-8611861 | mishkeydan@mishkeydan.co.il</Text>
        </View>
      </Page>
    </Document>
  );

  return Buffer.from(await renderToBuffer(doc));
}
