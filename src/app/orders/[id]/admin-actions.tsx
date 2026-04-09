"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  orderId: string;
}

export default function AdminActions({ orderId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [comment, setComment] = useState("");

  async function handleApprove() {
    if (!confirm("לאשר הזמנה זו? המגיש ומורשה החתימה יקבלו הודעה.")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/approve-admin`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "שגיאה באישור");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!comment.trim()) {
      setError("יש לציין סיבת דחייה");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/reject-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: comment.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "שגיאה בדחייה");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
      <h3 className="font-semibold text-blue-800 mb-1">ממתין לאישורך — מנהל מערכת</h3>
      <p className="text-blue-700 text-sm mb-4">
        בדוק את פרטי ההזמנה ואשר או דחה אותה. המגיש ומורשה החתימה יקבלו הודעה.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!showReject ? (
        <div className="flex gap-3">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="bg-green-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {loading ? "מעבד..." : "✓ אשר הזמנה"}
          </button>
          <button
            onClick={() => { setShowReject(true); setError(""); }}
            disabled={loading}
            className="bg-red-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            ✕ דחה הזמנה
          </button>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            סיבת הדחייה (חובה)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="פרט את סיבת הדחייה..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
          />
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={loading}
              className="bg-red-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? "שולח..." : "שלח דחייה"}
            </button>
            <button
              onClick={() => { setShowReject(false); setComment(""); setError(""); }}
              disabled={loading}
              className="border border-slate-300 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
