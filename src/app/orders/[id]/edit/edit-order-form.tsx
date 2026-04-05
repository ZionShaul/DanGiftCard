"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CardType {
  id: string;
  nameHe: string;
  discountPct: number;
  minLoadAmount: number;
  maxLoadAmount: number;
}

interface Signatory {
  id: string;
  fullName: string;
  email: string;
}

interface OrderItem {
  cardTypeId: string;
  quantity: number;
  loadAmount: number;
}

interface Props {
  orderId: string;
  initialItems: OrderItem[];
  initialSignatoryId: string;
  initialNotes: string;
  cardTypes: CardType[];
  signatories: Signatory[];
  minOrderTotal: number;
}

export default function EditOrderForm({
  orderId,
  initialItems,
  initialSignatoryId,
  initialNotes,
  cardTypes,
  signatories,
  minOrderTotal,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<OrderItem[]>(
    initialItems.length > 0
      ? initialItems
      : cardTypes.length > 0
      ? [{ cardTypeId: cardTypes[0].id, quantity: 1, loadAmount: cardTypes[0].minLoadAmount }]
      : []
  );
  const [signatoryId, setSignatoryId] = useState(initialSignatoryId);
  const [notes, setNotes] = useState(initialNotes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addItem() {
    if (cardTypes.length === 0) return;
    setItems([
      ...items,
      { cardTypeId: cardTypes[0].id, quantity: 1, loadAmount: cardTypes[0].minLoadAmount },
    ]);
  }

  function updateItem(index: number, field: keyof OrderItem, value: string | number) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function getCardType(id: string) {
    return cardTypes.find((ct) => ct.id === id);
  }

  function calcItemTotal(item: OrderItem) {
    const ct = getCardType(item.cardTypeId);
    if (!ct) return 0;
    const face = item.quantity * item.loadAmount;
    return face - face * (ct.discountPct / 100);
  }

  const totalPayable = items.reduce((s, i) => s + calcItemTotal(i), 0);
  const totalCards = items.reduce((s, i) => s + i.quantity, 0);

  async function putOrder() {
    const res = await fetch(`/api/v1/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((item) => ({
          cardTypeId: item.cardTypeId,
          quantity: Number(item.quantity),
          loadAmount: Number(item.loadAmount),
        })),
        notes,
        signatoryId: signatoryId || undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(typeof err.error === "string" ? err.error : "שגיאה בשמירת ההזמנה");
    }
    return res.json();
  }

  async function handleSaveDraft() {
    setLoading(true);
    setError("");
    try {
      await putOrder();
      router.push(`/orders/${orderId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!signatoryId) {
      setError("יש לבחור מורשה חתימה לפני הגשה");
      return;
    }
    if (items.length === 0) {
      setError("יש להוסיף לפחות פריט אחד");
      return;
    }
    if (totalPayable < minOrderTotal) {
      setError(`סכום ההזמנה המינימלי הוא ₪${minOrderTotal.toLocaleString()}`);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await putOrder();

      const submitRes = await fetch(`/api/v1/orders/${orderId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatoryId, termsAccepted: true }),
      });
      if (!submitRes.ok) {
        const err = await submitRes.json();
        throw new Error(typeof err.error === "string" ? err.error : "שגיאה בהגשת ההזמנה");
      }
      router.push(`/orders/${orderId}?submitted=1`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-700 mb-4">פריטי ההזמנה</h2>

        <div className="space-y-3 mb-4">
          {items.map((item, i) => {
            const ct = getCardType(item.cardTypeId);
            return (
              <div key={i} className="border border-slate-200 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">סוג כרטיס</label>
                    <select
                      value={item.cardTypeId}
                      onChange={(e) => updateItem(i, "cardTypeId", e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded px-2 py-1.5"
                    >
                      {cardTypes.map((ct) => (
                        <option key={ct.id} value={ct.id}>
                          {ct.nameHe} ({ct.discountPct}% הנחה)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">כמות כרטיסים</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                      className="w-full text-sm border border-slate-300 rounded px-2 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">
                      טעינה לכרטיס (₪{ct?.minLoadAmount}–₪{ct?.maxLoadAmount})
                    </label>
                    <input
                      type="number"
                      min={ct?.minLoadAmount}
                      max={ct?.maxLoadAmount}
                      value={item.loadAmount}
                      onChange={(e) =>
                        updateItem(i, "loadAmount", parseFloat(e.target.value) || 0)
                      }
                      className="w-full text-sm border border-slate-300 rounded px-2 py-1.5"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-sm text-slate-600">
                    סה&quot;כ לפריט:{" "}
                    <strong>
                      ₪{calcItemTotal(item).toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                    </strong>
                  </p>
                  <button
                    onClick={() => removeItem(i)}
                    className="text-red-500 text-xs hover:underline"
                  >
                    הסר
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={addItem}
          className="border border-dashed border-slate-300 text-slate-500 px-4 py-2 rounded-lg text-sm w-full hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          + הוסף שורה
        </button>

        {items.length > 0 && (
          <div className="mt-4 bg-slate-50 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span>
                סה&quot;כ כרטיסים: <strong>{totalCards}</strong>
              </span>
              <span>
                סה&quot;כ לתשלום:{" "}
                <strong>
                  ₪{totalPayable.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                </strong>
              </span>
            </div>
            {totalPayable < minOrderTotal && (
              <p className="text-red-600 text-xs mt-1">
                מינימום הזמנה: ₪{minOrderTotal.toLocaleString()}. חסר: ₪
                {(minOrderTotal - totalPayable).toLocaleString("he-IL", {
                  maximumFractionDigits: 0,
                })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Signatory */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-700 mb-4">מורשה חתימה לאישור</h2>
        <select
          value={signatoryId}
          onChange={(e) => setSignatoryId(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">-- בחר מורשה חתימה --</option>
          {signatories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.fullName} ({s.email})
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-700 mb-4">הערות</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
          placeholder="הערות להזמנה (אופציונלי)..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center gap-3">
        <a
          href={`/orders/${orderId}`}
          className="text-slate-500 text-sm hover:underline"
        >
          ביטול
        </a>
        <div className="flex gap-3">
          <button
            disabled={loading}
            onClick={handleSaveDraft}
            className="border border-slate-300 text-slate-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            {loading ? "שומר..." : "שמור טיוטה"}
          </button>
          <button
            disabled={loading || items.length === 0 || totalPayable < minOrderTotal || !signatoryId}
            onClick={handleSubmit}
            className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-40 transition-colors"
          >
            {loading ? "מגיש..." : "הגש לאישור"}
          </button>
        </div>
      </div>
    </div>
  );
}
