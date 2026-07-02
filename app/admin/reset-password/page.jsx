"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset request. Missing token parameter.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Token is missing. Cannot reset password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to reset password.");
      }

      setSuccess("Your password has been successfully updated.");
      setTimeout(() => {
        router.push("/admin");
      }, 3000);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[32px] p-8 md:p-10 shadow-2xl border border-[#2b2622]/5">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-serif text-[#2b2622] tracking-tighter leading-none">RakaaRituals</h2>
        <p className="text-[10px] text-[#6f6a65] uppercase font-black tracking-[0.3em] mt-3 bg-[#e8e1d9] inline-block px-3 py-1 rounded-full">Reset Admin Password</p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl p-4 mb-6 font-medium italic">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs rounded-xl p-4 mb-6 font-medium italic">
          ✨ {success}
          <p className="text-[9px] uppercase tracking-wider font-bold mt-1 text-[#6f6a65]/60">Redirecting to login...</p>
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5 flex flex-col">
            <label className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-bold ml-1">New Password</label>
            <input
              type="password"
              required
              disabled={!token || loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#f8f5f2] border-0 rounded-xl px-4 py-3 text-sm text-[#2b2622] focus:ring-2 focus:ring-[#b89b5e]/20 transition-all outline-none italic placeholder:text-[#6f6a65]/40"
              placeholder="Enter new password"
            />
          </div>

          <div className="space-y-1.5 flex flex-col">
            <label className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-bold ml-1">Confirm New Password</label>
            <input
              type="password"
              required
              disabled={!token || loading}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#f8f5f2] border-0 rounded-xl px-4 py-3 text-sm text-[#2b2622] focus:ring-2 focus:ring-[#b89b5e]/20 transition-all outline-none italic placeholder:text-[#6f6a65]/40"
              placeholder="Confirm new password"
            />
          </div>

          <button
            type="submit"
            disabled={!token || loading}
            className="w-full py-4 bg-[#b89b5e] hover:bg-[#2b2622] text-white font-bold uppercase tracking-[0.2em] text-xs rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      )}

      <div className="mt-8 text-center">
        <Link
          href="/admin"
          className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-bold hover:text-[#b89b5e] transition-colors"
        >
          ← Return to Login Gate
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[#f7f6f1] flex flex-col items-center justify-center p-6">
      <Suspense fallback={
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[32px] p-8 md:p-10 shadow-2xl border border-[#2b2622]/5 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#e8e1d9] border-t-[#b89b5e] rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2b2622]/40">Loading Form Parameters...</p>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
