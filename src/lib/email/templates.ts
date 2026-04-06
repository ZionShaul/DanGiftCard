import { sendActiveTrailEmail, getTemplateId } from "./activetrail";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface EmailOrderItem {
  cardTypeName: string;
  quantity: number;
  loadAmount: number;
  discountPct: number;
  payableTotal: number;
}

interface EmailOrder {
  orderNumber: string;
  organization: { name: string };
  orderWindow: { name: string; deliveryDate: Date };
  totalCards: number;
  totalFaceValue: number;
  totalPayable: number;
  requester: { fullName: string; email: string };
  signatory?: { fullName: string; email: string } | null;
  items?: EmailOrderItem[];
}

/**
 * Template merge variable names (must match $$...$$ placeholders in ActiveTrail templates).
 *
 * Template 1 – OTP login:
 *   $$otp_url$$  $$expiry$$
 *
 * Template 2 – Order submitted (to requester):
 *   $$order_number$$ $$org_name$$ $$window_name$$ $$delivery_date$$
 *   $$total_cards$$ $$total_face_value$$ $$total_payable$$ $$requester_name$$
 *   $$signatory_name$$
 *
 * Template 3 – Signatory approval request:
 *   $$order_number$$ $$org_name$$ $$window_name$$ $$delivery_date$$
 *   $$total_cards$$ $$total_face_value$$ $$total_payable$$ $$requester_name$$
 *   $$signatory_name$$ $$approve_url$$ $$reject_url$$ $$approval_url$$
 *
 * Template 4 – Signatory rejected (to requester):
 *   $$order_number$$ $$org_name$$ $$signatory_name$$ $$comment$$ $$edit_url$$
 *
 * Template 5 – Admin pending approval:
 *   $$order_number$$ $$org_name$$ $$window_name$$ $$delivery_date$$
 *   $$total_cards$$ $$total_face_value$$ $$total_payable$$ $$admin_url$$
 *
 * Template 6 – Order approved (to requester):
 *   $$order_number$$ $$org_name$$ $$window_name$$ $$delivery_date$$
 *   $$total_cards$$ $$total_face_value$$ $$total_payable$$ $$requester_name$$
 */

function buildItemsHtml(items: EmailOrderItem[], totalPayable: number): string {
  const rows = items.map((item) => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:6px 10px;text-align:right">${item.cardTypeName}</td>
      <td style="padding:6px 10px;text-align:center">${item.quantity}</td>
      <td style="padding:6px 10px;text-align:center">${formatCurrency(item.loadAmount)}</td>
      <td style="padding:6px 10px;text-align:center">${item.discountPct}%</td>
      <td style="padding:6px 10px;text-align:left;font-weight:bold">${formatCurrency(item.payableTotal)}</td>
    </tr>`).join("");

  return `<table style="width:100%;border-collapse:collapse;direction:rtl;font-family:Arial,sans-serif;font-size:13px">
  <thead>
    <tr style="background:#1a73e8;color:#fff">
      <th style="padding:8px 10px;text-align:right">סוג כרטיס</th>
      <th style="padding:8px 10px;text-align:center">כמות</th>
      <th style="padding:8px 10px;text-align:center">טעינה לכרטיס</th>
      <th style="padding:8px 10px;text-align:center">הנחה</th>
      <th style="padding:8px 10px;text-align:left">לתשלום</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr style="background:#e8f0fe">
      <td colspan="4" style="padding:8px 10px;text-align:right;font-weight:bold">סה״כ לתשלום</td>
      <td style="padding:8px 10px;text-align:left;font-weight:bold;color:#1a73e8">${formatCurrency(totalPayable)}</td>
    </tr>
  </tfoot>
</table>`;
}

function orderParams(order: EmailOrder): Record<string, string> {
  return {
    order_number: order.orderNumber,
    org_name: order.organization.name,
    window_name: order.orderWindow.name,
    delivery_date: formatDate(order.orderWindow.deliveryDate),
    total_cards: String(order.totalCards),
    total_face_value: formatCurrency(order.totalFaceValue),
    total_payable: formatCurrency(order.totalPayable),
    requester_name: order.requester.fullName,
    signatory_name: order.signatory?.fullName ?? "",
  };
}

export async function sendOrderSubmittedEmail(order: EmailOrder, orderLink?: string) {
  const params: Record<string, string> = { ...orderParams(order) };
  if (orderLink) params.order_link = orderLink;
  if (order.items && order.items.length > 0) {
    params.items_html = buildItemsHtml(order.items, order.totalPayable);
  }
  await sendActiveTrailEmail(
    getTemplateId("ACTIVETRAIL_TEMPLATE_ORDER_SUBMITTED"),
    order.requester.email,
    params,
    `הזמנה ${order.orderNumber} הוגשה – מישקי דן`
  );
}

export async function sendSignatoryRequestEmail(order: EmailOrder, approvalUrl: string, pdfLink?: string) {
  const signatory = order.signatory!;
  const params: Record<string, string> = {
    ...orderParams(order),
    approve_url: `${approvalUrl}&action=approve`,
    reject_url: `${approvalUrl}&action=reject`,
    approval_url: approvalUrl,
  };
  if (pdfLink) params.pdf_link = pdfLink;
  if (order.items && order.items.length > 0) {
    params.items_html = buildItemsHtml(order.items, order.totalPayable);
  }
  await sendActiveTrailEmail(
    getTemplateId("ACTIVETRAIL_TEMPLATE_SIGNATORY_REQUEST"),
    signatory.email,
    params,
    `נדרש אישורך – הזמנה ${order.orderNumber} | מישקי דן`
  );
}

export async function sendSignatoryRejectedEmail(
  order: EmailOrder,
  comment: string,
  editUrl: string
) {
  await sendActiveTrailEmail(
    getTemplateId("ACTIVETRAIL_TEMPLATE_SIGNATORY_REJECTED"),
    order.requester.email,
    {
      order_number: order.orderNumber,
      org_name: order.organization.name,
      signatory_name: order.signatory?.fullName ?? "",
      comment,
      edit_url: editUrl,
    },
    `הזמנה ${order.orderNumber} נדחתה – מישקי דן`
  );
}

export async function sendAdminPendingEmail(
  order: EmailOrder,
  adminEmail: string,
  adminUrl: string
) {
  await sendActiveTrailEmail(
    getTemplateId("ACTIVETRAIL_TEMPLATE_ADMIN_PENDING"),
    adminEmail,
    {
      ...orderParams(order),
      admin_url: adminUrl,
    },
    `הזמנה ${order.orderNumber} ממתינה לאישורך – מישקי דן`
  );
}

export async function sendOrderApprovedEmail(order: EmailOrder) {
  await sendActiveTrailEmail(
    getTemplateId("ACTIVETRAIL_TEMPLATE_ORDER_APPROVED"),
    order.requester.email,
    orderParams(order),
    `הזמנה ${order.orderNumber} אושרה! – מישקי דן`
  );
}
