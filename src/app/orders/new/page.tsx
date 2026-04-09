"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface OrderWindow {
  id: string;
  name: string;
  holiday: string;
  orderCloseAt: string;
  deliveryDate: string;
  minOrderTotal: number;
}

interface CardType {
  id: string;
  nameHe: string;
  discountPct: number;
  minLoadAmount: number;
  maxLoadAmount: number;
}

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface OrderItem {
  cardTypeId: string;
  quantity: number;
  loadAmount: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [windows, setWindows] = useState<OrderWindow[]>([]);
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [signatories, setSignatories] = useState<User[]>([]);
  const [selectedWindow, setSelectedWindow] = useState<string>("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedSignatory, setSelectedSignatory] = useState<string>("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const autoSelected = useRef(false);

  // Auto-select if only one active window
  useEffect(() => {
    if (windows.length === 1 && !autoSelected.current) {
      autoSelected.current = true;
      setSelectedWindow(windows[0].id);
      setStep(2);
    }
  }, [windows]);

  useEffect(() => {
    fetch("/api/v1/order-windows?active=true")
      .then((r) => r.json())
      .then(setWindows);
    fetch("/api/v1/card-types")
      .then((r) => r.json())
      .then((data: CardType[]) =>
        setCardTypes(
          Array.isArray(data)
            ? data.map((ct) => ({
                ...ct,
                discountPct: Number(ct.discountPct),
                minLoadAmount: Number(ct.minLoadAmount),
                maxLoadAmount: Number(ct.maxLoadAmount),
              }))
            : []
        )
      );
    fetch("/api/v1/users/signatories")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setSignatories(Array.isArray(data) ? data : []));
  }, []);

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

  const orderWindow = windows.find((w) => w.id === selectedWindow);
  const minTotal = orderWindow ? Number(orderWindow.minOrderTotal) : 2000;

  async function handleSubmit() {
    if (!termsAccepted) {
      setError("יש לאשר את תנאי השימוש");
      return;
    }
    if (!selectedSignatory) {
      setError("יש לבחור מורשה חתימה");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/orders/create-and-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderWindowId: selectedWindow,
          items: items.map((item) => ({
            cardTypeId: item.cardTypeId,
            quantity: Number(item.quantity),
            loadAmount: Number(item.loadAmount),
          })),
          notes,
          signatoryId: selectedSignatory,
          termsAccepted: true,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(typeof err.error === "string" ? err.error : "שגיאה בהגשת ההזמנה");
      }
      const order = await res.json();
      router.push(`/orders/${order.id}?submitted=1`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">הזמנה חדשה</h1>
        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className={`h-0.5 w-12 ${step > s ? "bg-blue-600" : "bg-slate-200"}`} />}
            </div>
          ))}
          <div className="mr-2 text-sm text-slate-600">
            {step === 1 ? "בחירת חלון הזמנות" : step === 2 ? "הוספת פריטים" : "אישור והגשה"}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Step 1 – Select window */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-700 mb-4">בחר חלון הזמנות</h2>
          {windows.length === 0 ? (
            <p className="text-slate-400">אין חלונות הזמנה פתוחים כרגע</p>
          ) : (
            <div className="space-y-3">
              {windows.map((w) => (
                <label
                  key={w.id}
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedWindow === w.id ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="window"
                    value={w.id}
                    checked={selectedWindow === w.id}
                    onChange={() => setSelectedWindow(w.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-slate-800">{w.name}</p>
                    <p className="text-sm text-slate-500">
                      מועד אחרון: {new Date(w.orderCloseAt).toLocaleDateString("he-IL")} |
                      אספקה: {new Date(w.deliveryDate).toLocaleDateString("he-IL")}
                    </p>
                    <p className="text-xs text-slate-400">מינימום הזמנה: ₪{Number(w.minOrderTotal).toLocaleString()}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
          <div className="mt-6 flex justify-start">
            <button
              disabled={!selectedWindow}
              onClick={() => setStep(2)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              המשך
            </button>
          </div>
        </div>
      )}

      {/* Step 2 – Add items */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">הוסף פריטים</h2>
            {windows.find((w) => w.id === selectedWindow) && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                חלון: {windows.find((w) => w.id === selectedWindow)?.name}
              </span>
            )}
          </div>
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
                        onChange={(e) => updateItem(i, "loadAmount", parseFloat(e.target.value) || 0)}
                        className="w-full text-sm border border-slate-300 rounded px-2 py-1.5"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-slate-600">
                      סה״כ לפריט: <strong>₪{calcItemTotal(item).toLocaleString("he-IL", { maximumFractionDigits: 0 })}</strong>
                    </p>
                    <button onClick={() => removeItem(i)} className="text-red-500 text-xs hover:underline">
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
                <span>סה״כ כרטיסים: <strong>{totalCards}</strong></span>
                <span>סה״כ לתשלום: <strong>₪{totalPayable.toLocaleString("he-IL", { maximumFractionDigits: 0 })}</strong></span>
              </div>
              {totalPayable < minTotal && (
                <p className="text-red-600 text-xs mt-1">
                  מינימום הזמנה: ₪{minTotal.toLocaleString()}. חסר: ₪{(minTotal - totalPayable).toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                </p>
              )}
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm text-slate-600 mb-1">הערות (אופציונלי)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2"
              placeholder="הערות להזמנה..."
            />
          </div>

          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(1)} className="text-slate-500 text-sm hover:underline">
              חזור
            </button>
            <button
              disabled={items.length === 0 || totalPayable < minTotal}
              onClick={() => setStep(3)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              המשך לאישור
            </button>
          </div>
        </div>
      )}

      {/* Step 3 – Confirm */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-700 mb-4">סיכום והגשה</h2>

          <div className="bg-slate-50 rounded-lg p-4 mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">חלון הזמנות:</span>
              <span>{orderWindow?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">סה״כ כרטיסים:</span>
              <span>{totalCards}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>לתשלום:</span>
              <span>₪{totalPayable.toLocaleString("he-IL", { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          {/* Items breakdown table */}
          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="px-3 py-2 text-right font-medium">סוג כרטיס</th>
                  <th className="px-3 py-2 text-center font-medium">כמות</th>
                  <th className="px-3 py-2 text-center font-medium">טעינה לכרטיס</th>
                  <th className="px-3 py-2 text-center font-medium">הנחה</th>
                  <th className="px-3 py-2 text-left font-medium">סה״כ לפריט</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => {
                  const ct = getCardType(item.cardTypeId);
                  return (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-800">{ct?.nameHe ?? "-"}</td>
                      <td className="px-3 py-2 text-center text-slate-700">{item.quantity}</td>
                      <td className="px-3 py-2 text-center text-slate-700">₪{item.loadAmount.toLocaleString("he-IL")}</td>
                      <td className="px-3 py-2 text-center text-slate-500">{ct?.discountPct ?? 0}%</td>
                      <td className="px-3 py-2 text-left font-medium text-slate-800">
                        ₪{calcItemTotal(item).toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td className="px-3 py-2">סה״כ</td>
                  <td className="px-3 py-2 text-center">{totalCards} כרטיסים</td>
                  <td colSpan={2} />
                  <td className="px-3 py-2 text-left text-blue-700">
                    ₪{totalPayable.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">בחר מורשה חתימה לאישור</label>
            <select
              value={selectedSignatory}
              onChange={(e) => setSelectedSignatory(e.target.value)}
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

          <div className="border border-slate-200 rounded-lg p-4 mb-4 text-xs text-slate-600 max-h-32 overflow-y-auto">
            <strong>תנאי השימוש:</strong> שליחת ההזמנה תשמש כ&quot;הרשאה מוקדמת&quot; לחיוב חשבון הארגון.
            לא תתאפשר החזרת כרטיסים מכל סיבה שהיא (מלבד החלפת כרטיסים שפג תוקפם לפי כללי הספק).
            התשלום ייגבה מראש. לתשלום בהעברה בנקאית: בנק הפועלים (12), סניף 412, חשבון 697890.
          </div>

          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-700">קראתי ואני מאשר/ת את תנאי השימוש</span>
          </label>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="text-slate-500 text-sm hover:underline">
              חזור
            </button>
            <button
              disabled={!termsAccepted || !selectedSignatory || loading}
              onClick={handleSubmit}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-40 hover:bg-green-700 transition-colors"
            >
              {loading ? "מגיש..." : "הגש הזמנה"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
