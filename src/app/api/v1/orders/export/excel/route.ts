import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ExcelJS from "exceljs";
import { STATUS_LABELS } from "@/lib/orders/status-machine";
import { formatDate } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, id: userId, organizationId } = session.user;

  // Admin should use the admin report endpoint
  if (role === "admin") {
    return NextResponse.json({ error: "Use admin reports endpoint" }, { status: 400 });
  }

  const where =
    role === "requester"
      ? { requesterId: userId }
      : { organizationId: organizationId! };

  const orders = await prisma.order.findMany({
    where,
    include: {
      organization: true,
      orderWindow: true,
      requester: { select: { fullName: true } },
      signatory: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "מישקי דן";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("הזמנות", { views: [{ rightToLeft: true }] });

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 11, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1a73e8" } },
    alignment: { horizontal: "center", vertical: "middle" },
  };

  ws.columns = [
    { header: "מספר הזמנה", key: "orderNumber", width: 18 },
    { header: "ארגון", key: "org", width: 22 },
    { header: "חלון הזמנות", key: "window", width: 22 },
    { header: "סטטוס", key: "status", width: 22 },
    { header: "מגיש", key: "requester", width: 22 },
    { header: "מורשה חתימה", key: "signatory", width: 22 },
    { header: "כרטיסים", key: "totalCards", width: 10 },
    { header: "סכום נקוב (₪)", key: "totalFaceValue", width: 16 },
    { header: "לתשלום (₪)", key: "totalPayable", width: 14 },
    { header: "תאריך", key: "createdAt", width: 14 },
    { header: "אספקה", key: "deliveryDate", width: 14 },
  ];

  ws.getRow(1).eachCell((cell) => { cell.style = headerStyle; });
  ws.getRow(1).height = 28;

  for (const order of orders) {
    ws.addRow({
      orderNumber: order.orderNumber,
      org: order.organization.name,
      window: order.orderWindow.name,
      status: STATUS_LABELS[order.status],
      requester: order.requester.fullName,
      signatory: order.signatory?.fullName ?? "–",
      totalCards: order.totalCards,
      totalFaceValue: Number(order.totalFaceValue),
      totalPayable: Number(order.totalPayable),
      createdAt: formatDate(order.createdAt),
      deliveryDate: formatDate(order.orderWindow.deliveryDate),
    });
  }

  [8, 9].forEach((col) => { ws.getColumn(col).numFmt = "#,##0 ₪"; });

  const summaryRow = ws.addRow({
    orderNumber: "סה״כ",
    totalCards: orders.reduce((s, o) => s + o.totalCards, 0),
    totalFaceValue: orders.reduce((s, o) => s + Number(o.totalFaceValue), 0),
    totalPayable: orders.reduce((s, o) => s + Number(o.totalPayable), 0),
  });
  summaryRow.font = { bold: true };
  summaryRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="my-orders-${Date.now()}.xlsx"`,
    },
  });
}
