"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

type Step = "email" | "code";

export default function LoginForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const searchParams = useSearchParams();
  const isError = searchParams.get("error") === "1";
  const isInactive = searchParams.get("error") === "inactive";

  // שלב 1 — שליחת קוד למייל
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "שגיאה בשליחת הקוד. אנא נסה שוב.");
      return;
    }

    setInfo(`קוד אימות נשלח לכתובת ${email.trim()}`);
    setStep("code");
  }

  // שלב 2 — אימות הקוד וכניסה
  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // אמת קוד מול השרת
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), code: code.trim() }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      setError(data.error ?? "שגיאה באימות הקוד.");
      return;
    }

    // קוד אומת — כניסה דרך NextAuth Credentials
    const result = await signIn("credentials", {
      email: email.trim(),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("שגיאה בכניסה למערכת. אנא נסה שוב.");
      return;
    }

    window.location.href = "/dashboard";
  }

  // חזרה לשלב מייל לשליחת קוד חדש
  function handleResend() {
    setCode("");
    setError("");
    setInfo("");
    setStep("email");
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      {/* Logo / Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white text-2xl font-bold">מ</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">משקי דן</h1>
        <p className="text-slate-500 mt-1">מערכת הזמנת תווי שי</p>
      </div>

      {(isError || isInactive) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm text-center">
          {isInactive
            ? "חשבונך אינו פעיל. אנא פנה למנהל המערכת."
            : "שגיאה בהתחברות. אנא נסה שוב."}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      {info && !error && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-blue-700 text-sm text-center">
          {info}
        </div>
      )}

      {/* שלב 1 — הזנת מייל */}
      {step === "email" && (
        <form onSubmit={handleSendCode} className="space-y-4">
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
            {loading ? "שולח קוד..." : "שלח קוד אימות"}
          </button>
        </form>
      )}

      {/* שלב 2 — הזנת קוד */}
      {step === "code" && (
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              קוד אימות (6 ספרות)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              placeholder="123456"
              autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "מאמת..." : "כניסה"}
          </button>
          <button
            type="button"
            onClick={handleResend}
            className="w-full text-sm text-slate-500 hover:text-blue-600 transition-colors"
          >
            לא קיבלת קוד? שלח קוד חדש
          </button>
        </form>
      )}
    </div>
  );
}
