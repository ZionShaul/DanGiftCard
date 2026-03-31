"use client";

import { useState, useEffect, use } from "react";
import { formatDate } from "@/lib/utils";

interface OrderSummary {
  id: string;
  orderNumber: string;
  organization: string;
  orderWindow: string;
  deliveryDate: string;
  requester: string;
  totalCards: number;
  totalFaceValue: number;
  totalPayable: number;
  items: Array<{
    cardType: string;
    quantity: number;
    loadAmount: number;
    discountPct: number;
    payableTotal: number;
  }>;
}

type PageState = "loading" | "ready" | "error" | "done" | "rejecting";

export default function ApprovalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [state, setState] = useState<PageState>("loading");
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<"approved" | "rejected" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/approval/${token}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setErrorMsg(data.error ?? "שגיאה");
          setState("error");
        } else {
          setOrder(data.order);
          setState("ready");
        }
      })
      .catch(() => {
        setErrorMsg("שגיאת רשת");
        setState("error");
      });
  }, [token]);

  async function handleAction(action: "approve" | "reject") {
    if (action === "reject" && !comment.trim()) {
      alert("יש לציין סיבת דחייה");
      return;
    }
    setSubmitting(true);
    const res = await fetch(`/api/approval/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment: comment || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      setResult(action === "approve" ? "approved" : "rejected");
      setState("done");
    } else {
      setErrorMsg(data.error ?? "שגיאה");
      setState("error");
    }
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-blue-600 px-6 py-5 text-white">
            <h1 className="text-xl font-bold">מישקי דן – אישור הזמנת תווי שי</h1>
          </div>

          <div className="p-6">
            {state === "loading" && (
              <div className="text-center py-8 text-slate-400">טוען...</div>
            )}

            {state === "error" && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-red-600 text-xl">✕</span>
                </div>
                <p className="text-red-600 font-medium">{errorMsg}</p>
                <p className="text-slate-400 text-sm mt-2">ייתכן שהקישור פג תוקפו או שההזמנה כבר טופלה</p>
              </div>
            )}

            {state === "done" && (
              <div className="text-center py-8">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                    result === "approved" ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  <span className={`text-xl ${result === "approved" ? "text-green-600" : "text-red-600"}`}>
                    {result === "approved" ? "✓" : "✕"}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-slate-800 mb-2">
                  {result === "approved" ? "ההזמנה אושרה!" : "ההזמנה נדחתה"}
                </h2>
                <p className="text-slate-500 text-sm">
                  {result === "approved"
                    ? "ההזמנה הועברה לאישור מנהל מישקי דן. תודה!"
                    : "המגיש יקבל הודעה ויוכל לתקן ולהגיש מחדש."}
                </p>
              </div>
            )}

            {state === "ready" && order && (
              <>
                <p className="text-slate-600 text-sm mb-4">
                  אנא בדוק/י את פרטי ההזמנה ואשר/י או דחה/י אותה.
                </p>

                <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
                  <InfoRow label="מספר הזמנה" value={order.orderNumber} />
                  <InfoRow label="ארגון" value={order.organization} />
                  <InfoRow label="חלון הזמנות" value={order.orderWindow} />
                  <InfoRow label="תאריך אספקה" value={formatDate(order.deliveryDate)} />
                  <InfoRow label="מגיש" value={order.requester} />
                  <InfoRow label="כרטיסים" value={String(order.totalCards)} />
                  <InfoRow
                    label="לתשלום"
                    value={`₪${Number(order.totalPayable).toLocaleString("he-IL", { maximumFractionDigits: 0 })}`}
                    bold
                  />
                </div>

                {/* Items */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">פירוט פריטים:</h3>
                  <table className="w-full text-xs text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-right py-1">סוג כרטיס</th>
                        <th className="text-center py-1">כמות</th>
                        <th className="text-center py-1">טעינה</th>
                        <th className="text-center py-1">הנחה</th>
                        <th className="text-left py-1">לתשלום</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-1">{item.cardType}</td>
                          <td className="text-center py-1">{item.quantity}</td>
                          <td className="text-center py-1">₪{item.loadAmount}</td>
                          <td className="text-center py-1">{item.discountPct}%</td>
                          <td className="text-left py-1">
                            ₪{Number(item.payableTotal).toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Reject comment */}
                {state === "ready" && (
                  <div className="mb-4">
                    <label className="block text-xs text-slate-500 mb-1">
                      הערה לדחייה (חובה אם דוחים):
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
                      placeholder="סיבת הדחייה..."
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction("approve")}
                    disabled={submitting}
                    className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 transition-colors"
                  >
                    אשר הזמנה
                  </button>
                  <button
                    onClick={() => handleAction("reject")}
                    disabled={submitting || !comment.trim()}
                    className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-40 transition-colors"
                  >
                    דחה הזמנה
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          מישקי דן | mishkeydan@mishkeydan.co.il | 08-8611861
        </p>
      </div>
    </div>
  );
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}:</span>
      <span className={bold ? "font-bold" : ""}>{value}</span>
    </div>
  );
}
