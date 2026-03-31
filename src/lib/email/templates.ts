import { getResend, getFromAddress, getBranding } from "./index";
import { formatCurrency, formatDate } from "@/lib/utils";

interface EmailOrder {
  orderNumber: string;
  organization: { name: string };
  orderWindow: { name: string; deliveryDate: Date };
  totalCards: number;
  totalFaceValue: number;
  totalPayable: number;
  requester: { fullName: string; email: string };
  signatory?: { fullName: string; email: string } | null;
}

function baseHtml(content: string, primaryColor = "#1a73e8") {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Heebo', Arial, sans-serif; background: #f5f5f5; direction: rtl; }
    .container { max-width: 600px; margin: 32px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: ${primaryColor}; padding: 24px 32px; color: white; }
    .header h1 { font-size: 22px; font-weight: 700; }
    .body { padding: 32px; }
    .info-box { background: #f8f9fa; border-radius: 6px; padding: 16px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
    .info-row:last-child { border-bottom: none; font-weight: 600; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 8px 4px; }
    .btn-primary { background: ${primaryColor}; color: white; }
    .btn-danger { background: #dc3545; color: white; }
    .footer { padding: 16px 32px; background: #f8f9fa; font-size: 12px; color: #666; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">מישקי דן | mishkeydan@mishkeydan.co.il | 08-8611861</div>
  </div>
</body>
</html>`;
}

function orderInfoHtml(order: EmailOrder) {
  return `<div class="info-box">
    <div class="info-row"><span>מספר הזמנה:</span><span>${order.orderNumber}</span></div>
    <div class="info-row"><span>ארגון:</span><span>${order.organization.name}</span></div>
    <div class="info-row"><span>חלון הזמנות:</span><span>${order.orderWindow.name}</span></div>
    <div class="info-row"><span>תאריך אספקה:</span><span>${formatDate(order.orderWindow.deliveryDate)}</span></div>
    <div class="info-row"><span>מספר כרטיסים:</span><span>${order.totalCards}</span></div>
    <div class="info-row"><span>סכום נקוב:</span><span>${formatCurrency(order.totalFaceValue)}</span></div>
    <div class="info-row"><span>לתשלום (אחרי הנחה):</span><span>${formatCurrency(order.totalPayable)}</span></div>
  </div>`;
}

export async function sendOrderSubmittedEmail(order: EmailOrder) {
  const from = await getFromAddress();
  const branding = await getBranding();
  const primary = branding.primaryColor ?? "#1a73e8";

  const html = baseHtml(`
    <div class="header"><h1>הזמנה הוגשה לאישור</h1></div>
    <div class="body">
      <p>שלום ${order.requester.fullName},</p>
      <p style="margin-top:12px">הזמנתך הוגשה בהצלחה וממתינה לאישור החתם.</p>
      ${orderInfoHtml(order)}
      ${order.signatory ? `<p>החתם: <strong>${order.signatory.fullName}</strong></p>` : ""}
    </div>
  `, primary);

  await getResend().emails.send({
    from,
    to: order.requester.email,
    subject: `הזמנה ${order.orderNumber} הוגשה – מישקי דן`,
    html,
  });
}

export async function sendSignatoryRequestEmail(
  order: EmailOrder,
  approvalUrl: string
) {
  const from = await getFromAddress();
  const branding = await getBranding();
  const primary = branding.primaryColor ?? "#1a73e8";
  const signatory = order.signatory!;

  const html = baseHtml(`
    <div class="header"><h1>נדרש אישורך להזמנת תווי שי</h1></div>
    <div class="body">
      <p>שלום ${signatory.fullName},</p>
      <p style="margin-top:12px">${order.requester.fullName} יצר הזמנת תווי שי עבור ${order.organization.name}. אנא בדוק/י את פרטי ההזמנה ואשר/י או דחה/י אותה.</p>
      ${orderInfoHtml(order)}
      <div style="text-align:center; margin-top:24px">
        <a href="${approvalUrl}&action=approve" class="btn btn-primary">אשר הזמנה</a>
        <a href="${approvalUrl}&action=reject" class="btn btn-danger">דחה הזמנה</a>
      </div>
      <p style="margin-top:16px; font-size:13px; color:#666">לחלופין, לחץ על הקישור: <a href="${approvalUrl}">${approvalUrl}</a></p>
    </div>
  `, primary);

  await getResend().emails.send({
    from,
    to: signatory.email,
    subject: `נדרש אישורך – הזמנה ${order.orderNumber} | מישקי דן`,
    html,
  });
}

export async function sendSignatoryRejectedEmail(
  order: EmailOrder,
  comment: string,
  editUrl: string
) {
  const from = await getFromAddress();
  const branding = await getBranding();
  const primary = branding.primaryColor ?? "#1a73e8";

  const html = baseHtml(`
    <div class="header" style="background:#dc3545"><h1>הזמנה נדחתה</h1></div>
    <div class="body">
      <p>שלום ${order.requester.fullName},</p>
      <p style="margin-top:12px">הזמנתך נדחתה ע"י החתם ${order.signatory?.fullName ?? ""}.</p>
      <div class="info-box">
        <strong>סיבת הדחייה:</strong>
        <p style="margin-top:8px">${comment}</p>
      </div>
      ${orderInfoHtml(order)}
      <div style="text-align:center; margin-top:24px">
        <a href="${editUrl}" class="btn btn-primary">ערוך והגש מחדש</a>
      </div>
    </div>
  `, primary);

  await getResend().emails.send({
    from,
    to: order.requester.email,
    subject: `הזמנה ${order.orderNumber} נדחתה – מישקי דן`,
    html,
  });
}

export async function sendAdminPendingEmail(order: EmailOrder, adminEmail: string, adminUrl: string) {
  const from = await getFromAddress();
  const branding = await getBranding();
  const primary = branding.primaryColor ?? "#1a73e8";

  const html = baseHtml(`
    <div class="header"><h1>הזמנה חדשה לאישור סופי</h1></div>
    <div class="body">
      <p>הזמנה חדשה אושרה ע"י החתם וממתינה לאישורך הסופי.</p>
      ${orderInfoHtml(order)}
      <div style="text-align:center; margin-top:24px">
        <a href="${adminUrl}" class="btn btn-primary">עבור להזמנה</a>
      </div>
    </div>
  `, primary);

  await getResend().emails.send({
    from,
    to: adminEmail,
    subject: `הזמנה ${order.orderNumber} ממתינה לאישורך – מישקי דן`,
    html,
  });
}

export async function sendOrderApprovedEmail(order: EmailOrder) {
  const from = await getFromAddress();
  const branding = await getBranding();
  const primary = branding.primaryColor ?? "#1a73e8";

  const html = baseHtml(`
    <div class="header" style="background:#28a745"><h1>הזמנה אושרה סופית!</h1></div>
    <div class="body">
      <p>שלום ${order.requester.fullName},</p>
      <p style="margin-top:12px">הזמנתך אושרה סופית. תווי השי יהיו מוכנים לאיסוף במועד האספקה.</p>
      ${orderInfoHtml(order)}
      <div class="info-box" style="margin-top:16px">
        <strong>פרטי תשלום:</strong>
        <div class="info-row"><span>בנק:</span><span>הפועלים (12)</span></div>
        <div class="info-row"><span>סניף:</span><span>412</span></div>
        <div class="info-row"><span>חשבון:</span><span>697890</span></div>
        <div class="info-row"><span>שם החשבון:</span><span>מישקי הדרום אשראי ורכישות</span></div>
      </div>
      <p style="margin-top:16px; font-size:13px; color:#666">לשאלות: נועה 08-8611861 | mishkeydan@mishkeydan.co.il</p>
    </div>
  `, primary);

  await getResend().emails.send({
    from,
    to: order.requester.email,
    subject: `הזמנה ${order.orderNumber} אושרה! – מישקי דן`,
    html,
  });
}
