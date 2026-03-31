"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const isVerify = searchParams.get("verify") === "1";
  const isError = searchParams.get("error") === "1";
  const isInactive = searchParams.get("error") === "inactive";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("resend", { email, redirect: false });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      {/* Logo / Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">מ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">מישקי דן</h1>
        <p className="text-slate-500 mt-1">מערכת הזמנות תווי שי</p>
      </div>

      {(isError || isInactive) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm text-center">
          {isInactive ? "חשבונך אינו פעיל. אנא פנה למנהל המערכת." : "שגיאה בהתחברות. אנא נסה שוב."}
        </div>
      )}

      {sent || isVerify ? (
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">בדוק את תיבת המייל שלך</h2>
          <p className="text-slate-500 text-sm">
            שלחנו קישור כניסה לכתובת המייל שלך. הקישור תקף ל-15 דקות.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              כתובת מייל
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.co.il"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "שולח..." : "שלח קישור כניסה"}
          </button>
        </form>
      )}

      <p className="text-xs text-slate-400 text-center mt-6">
        כניסה ללא סיסמה – אנו שולחים קוד חד-פעמי למייל שלך
      </p>
    </div>
  );
}
