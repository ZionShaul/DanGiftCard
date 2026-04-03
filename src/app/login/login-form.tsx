"use client";

import { useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";

type Step = "email" | "code";

export default function LoginForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const searchParams = useSearchParams();
  const router = useRouter();
  const isError = searchParams.get("error") === "1";
  const isInactive = searchParams.get("error") === "inactive";

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const checkRes = await fetch("/api/auth/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const checkData = await checkRes.json();
    if (!checkData.exists) {
      setLoading(false);
      setError("המשתמש אינו קיים במערכת. אנא פנה למשקי דן.");
      return;
    }

    const result = await signIn("resend", { email: email.trim(), redirect: false, callbackUrl: "/dashboard" });

    setLoading(false);

    if (result?.error) {
      setError("שגיאה בשליחת הקוד. אנא נסה שוב.");
      return;
    }

    setStep("code");
  }

  // ── Step 2: verify OTP ────────────────────────────────────────────────────
  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const fullCode = code.join("");
    if (fullCode.length < 6) {
      setError("אנא הזן את כל 6 הספרות");
      return;
    }
    setLoading(true);

    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), code: fullCode }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "קוד שגוי. אנא נסה שוב.");
      return;
    }

    // Navigate to the next-auth callback URL to complete sign-in
    window.location.href = data.callbackUrl;
  }

  // ── OTP digit input handling ──────────────────────────────────────────────
  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleDigitPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
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

      {/* Global error from URL params */}
      {(isError || isInactive) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm text-center">
          {isInactive ? "חשבונך אינו פעיל. אנא פנה למנהל המערכת." : "שגיאה בהתחברות. אנא נסה שוב."}
        </div>
      )}

      {/* Inline error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      {/* ── Step 1: Email ── */}
      {step === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
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
            {loading ? "שולח קוד..." : "שלח קוד כניסה"}
          </button>
        </form>
      )}

      {/* ── Step 2: OTP code entry ── */}
      {step === "code" && (
        <form onSubmit={handleCodeSubmit} className="space-y-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">הזן את הקוד</h2>
            <p className="text-slate-500 text-sm">
              שלחנו קוד בן 6 ספרות ל-<span className="font-medium text-slate-700" dir="ltr">{email}</span>
            </p>
          </div>

          {/* 6-digit input */}
          <div className="flex justify-center gap-2" dir="ltr">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                pattern="\d"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(i, e)}
                onPaste={handleDigitPaste}
                className="w-11 h-12 text-center text-xl font-bold border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || code.join("").length < 6}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? "מאמת..." : "כניסה"}
          </button>

          <button
            type="button"
            onClick={() => { setStep("email"); setCode(["","","","","",""]); setError(""); }}
            className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            ← שנה כתובת מייל
          </button>
        </form>
      )}

      <p className="text-xs text-slate-400 text-center mt-6">
        כניסה ללא סיסמה – קוד חד-פעמי נשלח למייל שלך
      </p>
    </div>
  );
}
