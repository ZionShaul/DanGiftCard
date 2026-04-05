import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { formatCurrency, formatDate } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/orders/status-machine";

Font.register({
  family: "Alef",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/alef/v21/FeVQS0BTqb-Deo5rF1F2V5Ro.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/alef/v21/FeVIS0BTqb-DeoZrGmF-bEVlUyg.ttf",
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
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  rowLabel: { color: "#666", fontSize: 10 },
  rowValue: { fontSize: 10, fontWeight: "bold" },
  table: { marginTop: 8 },
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: "#1a73e8",
    padding: 6,
    borderRadius: 4,
  },
  tableHeaderCell: { color: "#fff", fontSize: 9, flex: 1, textAlign: "center" },
  tableRow: {
    flexDirection: "row-reverse",
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tableCell: { fontSize: 9, flex: 1, textAlign: "center" },
  totalRow: {
    flexDirection: "row-reverse",
    padding: 8,
    backgroundColor: "#e8f0fe",
    borderRadius: 4,
    marginTop: 4,
  },
  totalLabel: { fontWeight: "bold", fontSize: 11, flex: 1, textAlign: "right" },
  totalValue: { fontWeight: "bold", fontSize: 11, color: "#1a73e8" },
  footer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#fff3cd",
    borderRadius: 6,
    fontSize: 9,
    color: "#856404",
  },
  paymentBox: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1a73e8",
    borderRadius: 6,
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
          <Text style={styles.headerTitle}>מישקי דן – הזמנת תווי שי</Text>
          <Text style={styles.headerSub}>
            {order.orderNumber} | {formatDate(order.createdAt)}
          </Text>
        </View>

        {/* Order details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פרטי הזמנה</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>ארגון:</Text>
            <Text style={styles.rowValue}>{order.organization.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>חלון הזמנות:</Text>
            <Text style={styles.rowValue}>{order.orderWindow.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>תאריך אספקה:</Text>
            <Text style={styles.rowValue}>{formatDate(order.orderWindow.deliveryDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>סטטוס:</Text>
            <Text style={styles.rowValue}>{STATUS_LABELS[order.status]}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>מגיש ההזמנה:</Text>
            <Text style={styles.rowValue}>{order.requester.fullName}</Text>
          </View>
          {order.signatory && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>חתם מאשר:</Text>
              <Text style={styles.rowValue}>{order.signatory.fullName}</Text>
            </View>
          )}
        </View>

        {/* Items table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>פירוט הזמנה</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>סוג כרטיס</Text>
              <Text style={styles.tableHeaderCell}>כמות</Text>
              <Text style={styles.tableHeaderCell}>טעינה לכרטיס</Text>
              <Text style={styles.tableHeaderCell}>הנחה</Text>
              <Text style={styles.tableHeaderCell}>לתשלום</Text>
            </View>
            {order.items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.tableCell}>{item.cardType.nameHe}</Text>
                <Text style={styles.tableCell}>{item.quantity}</Text>
                <Text style={styles.tableCell}>₪{Number(item.loadAmount).toLocaleString()}</Text>
                <Text style={styles.tableCell}>{Number(item.discountPct)}%</Text>
                <Text style={styles.tableCell}>{formatCurrency(Number(item.payableTotal))}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>סה״כ ({order.totalCards} כרטיסים):</Text>
              <Text style={styles.totalValue}>{formatCurrency(Number(order.totalPayable))}</Text>
            </View>
          </View>
        </View>

        {/* Payment details */}
        <View style={styles.paymentBox}>
          <Text style={{ ...styles.sectionTitle, marginBottom: 6 }}>פרטי תשלום</Text>
          <Text style={{ fontSize: 10, lineHeight: 1.6 }}>בנק הפועלים (12) | סניף 412 | חשבון 697890</Text>
          <Text style={{ fontSize: 10, lineHeight: 1.6 }}>שם החשבון: מישקי הדרום אשראי ורכישות</Text>
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
