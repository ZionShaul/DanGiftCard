import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <Suspense fallback={<div className="bg-white rounded-2xl shadow-lg p-8 text-center text-slate-400">טוען...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
