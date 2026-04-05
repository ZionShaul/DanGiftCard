"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("האם למחוק הזמנה זו לצמיתות?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(typeof err.error === "string" ? err.error : "שגיאה במחיקת ההזמנה");
        return;
      }
      router.push("/orders");
    } catch {
      alert("שגיאה במחיקת ההזמנה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      disabled={loading}
      onClick={handleDelete}
      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 transition-colors"
    >
      {loading ? "מוחק..." : "מחק הזמנה"}
    </button>
  );
}
