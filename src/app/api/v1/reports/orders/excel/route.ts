import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OrderStatus } from "@prisma/client";
import ExcelJS from "exceljs";
import { STATUS_LABELS } from "@/lib/orders/status-machine";
import { formatDate } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as OrderStatus | null;
  const orgId = searchParams.get("organizationId");
  const windowId = searchParams.get("orderWindowId");

  const orders = await prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(orgId ? { organizationId: orgId } : {}),
      ...(windowId ? { orderWindowId: windowId } : {}),
    },
    include: {
      organization: true,
      orderWindow: true,
      requester: { select: { fullName: true, email: true } },
      signatory: { select: { fullName: true } },
      items: { include: { cardType: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "מישקי דן";
  workbook.created = new Date();

  const ws = workbook.addWorksheet("הזמנות", {
    views: [{ rightToLeft: true }],
  });

  // Header style
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 11, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1a73e8" } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: {
      bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
    },
  };

  ws.columns = [
    { header: "מספר הזמנה", key: "orderNumber", width: 18 },
    { header: "קיבוץ/ארגון", key: "org", width: 25 },
    { header: "חלון הזמנות", key: "window", width: 22 },
    { header: "סטטוס", key: "status", width: 22 },
    { header: "מגיש", key: "requester", width: 22 },
    { header: "מורשה חתימה", key: "signatory", width: 22 },
    { header: "כרטיסים", key: "totalCards", width: 10 },
    { header: "סכום נקוב (₪)", key: "totalFaceValue", width: 16 },
    { header: "לתשלום (₪)", key: "totalPayable", width: 14 },
    { header: "תאריך יצירה", key: "createdAt", width: 16 },
    { header: "תאריך אספקה", key: "deliveryDate", width: 16 },
  ];

  // Apply header styles
  ws.getRow(1).eachCell((cell) => {
    cell.style = headerStyle;
  });
  ws.getRow(1).height = 28;

  // Add data rows
  for (const order of orders) {
    ws.addRow({
      orderNumber: order.orderNumber,
      org: order.organization.name,
      window: order.orderWindow.name,
      status: STATUS_LABELS[order.status],
      requester: order.requester.fullName,
      signatory: order.signatory?.fullName ?? "-",
      totalCards: order.totalCards,
      totalFaceValue: Number(order.totalFaceValue),
      totalPayable: Number(order.totalPayable),
      createdAt: formatDate(order.createdAt),
      deliveryDate: formatDate(order.orderWindow.deliveryDate),
    });
  }

  // Format currency columns
  [8, 9].forEach((col) => {
    ws.getColumn(col).numFmt = "#,##0 ₪";
  });

  // Add summary row
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
      "Content-Disposition": `attachment; filename="orders-export-${Date.now()}.xlsx"`,
    },
  });
}
