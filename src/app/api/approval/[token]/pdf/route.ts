import { NextRequest, NextResponse } from "next/server";
import { verifyApprovalToken } from "@/lib/auth/approval-token";
import { generateOrderPdf } from "@/lib/pdf/generate-order-pdf";
import { prisma } from "@/lib/db";

/**
 * Public PDF download endpoint — accessible via the signatory's email link.
 * No authentication required; validated via the one-time approval token.
 */
export async function GET(_: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const payload = await verifyApprovalToken(token);
  if (!payload) {
    return NextResponse.json({ error: "הקישור אינו תקף או שפג תוקפו" }, { status: 401 });
  }

  const order = await prisma.order.findUnique({
    where: { id: payload.orderId },
    select: { id: true, orderNumber: true, signatoryId: true },
  });

  if (!order) return NextResponse.json({ error: "הזמנה לא נמצאה" }, { status: 404 });
  if (order.signatoryId !== payload.signatoryId) {
    return NextResponse.json({ error: "אינך מורשה לצפות בהזמנה זו" }, { status: 401 });
  }

  try {
    const pdfBuffer = await generateOrderPdf(order.id);
    const filename = `הזמנה-${order.orderNumber}.pdf`;
    return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "שגיאה ביצירת ה-PDF";
    return NextResponse.json({ error: `שגיאה ביצירת ה-PDF: ${message}` }, { status: 500 });
  }
}
