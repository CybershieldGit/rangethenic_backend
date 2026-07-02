"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Noto_Serif } from "next/font/google";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-serif",
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005";

function Corner({ className }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute h-10 w-10 ${className}`}
      style={{
        backgroundColor: '#420001',
        WebkitMaskImage: 'url(/corner_sqare.svg)',
        maskImage: 'url(/corner_sqare.svg)',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

    if (password.length < 8) {
      setError("Use 8 or more characters with mix of letters, numbers, & symbols.");
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
    <div className="relative mx-auto w-full max-w-[508px]">
      <div className="relative flex min-h-[480px] w-full flex-col border border-[#BD8A3C]/50 bg-[#FFF9F3] px-9 py-10">
        {/* Ornate frame inset from the card edges */}
        <div className="pointer-events-none absolute inset-3">
          <Corner className="left-0 top-0" />
          <Corner className="right-0 top-0 -scale-x-100" />
          <Corner className="left-0 bottom-0 -scale-y-100" />
          <Corner className="right-0 bottom-0 -scale-100" />

          {/* Connecting gold rules on all four sides, aligned past the corners */}
          <span className="absolute left-11 right-11 top-0 h-px bg-[#BD8A3C]/50" />
          <span className="absolute left-11 right-11 bottom-0 h-px bg-[#BD8A3C]/50" />
          <span className="absolute top-11 bottom-11 left-0 w-px bg-[#BD8A3C]/50" />
          <span className="absolute top-11 bottom-11 right-0 w-px bg-[#BD8A3C]/50" />
        </div>

        <div className="relative text-center">
          <h1 className="font-serif text-[36px] font-bold leading-tight text-[#420001]" style={{ fontFamily: "var(--font-noto-serif), Georgia, serif" }}>
            Create New Password
          </h1>
          <p className="mt-2 font-sans text-[16px] leading-relaxed text-[#8E8E8E]">
            Please create a new password for your admin account.
          </p>
          <img
            src="/historical_seperator.svg"
            alt=""
            className="mx-auto mt-5 h-4 w-auto"
          />
        </div>

        <div className="relative mt-6 flex flex-1 flex-col">
          {error && (
            <div className="mb-5 flex items-center gap-3 bg-[#FF00001A] px-4 py-3">
              <AlertCircle size={28} className="mt-0.5 shrink-0 text-[#420001]" />
              <div className="text-left">
                <p className="font-sans text-sm font-semibold text-[#420001]">Unable to reset password</p>
                <p className="mt-0.5 font-sans text-[10px] text-[#420001]">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm rounded-xl p-4 mb-6 font-medium italic">
              ✨ {success}
              <p className="text-[10px] uppercase tracking-wider font-bold mt-1 text-[#6f6a65]/60">Redirecting to login...</p>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="flex flex-1 flex-col space-y-3">
              <div>
                <div className="relative w-full">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A89E96]">
                    <Lock size={17} strokeWidth={1.5} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={!token || loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="h-[46px] w-full rounded-none border border-[#BD8A3C4D] bg-[#BD8A3C0A] font-sans text-sm text-[#4a3f38] placeholder:text-[#A89E96] focus:border-[#420001] focus:outline-none focus:ring-0 pl-10 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[#A89E96] hover:text-[#420001] cursor-pointer bg-transparent border-0 p-0"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </div>
                <p className="mt-2 text-left font-sans text-[11px] text-[#9A9088]">
                  Use 8 or more characters with mix of letters, numbers, &amp; symbols.
                </p>
              </div>

              <div className="relative w-full">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A89E96]">
                  <Lock size={17} strokeWidth={1.5} />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  disabled={!token || loading}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="h-[46px] w-full rounded-none border border-[#BD8A3C4D] bg-[#BD8A3C0A] font-sans text-sm text-[#4a3f38] placeholder:text-[#A89E96] focus:border-[#420001] focus:outline-none focus:ring-0 pl-10 pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-[#A89E96] hover:text-[#420001] cursor-pointer bg-transparent border-0 p-0"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!token || loading}
                  className="h-[46px] w-full rounded-none bg-[#420001] font-sans text-[16px] font-semibold tracking-wide text-white transition-colors hover:bg-[#2e0001] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer border-0"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}

          <p className="mt-auto pt-6 text-center">
            <Link href="/admin" className="font-sans text-[16px] font-bold text-[#420001] hover:underline">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className={`${notoSerif.variable} min-h-screen bg-[#FDF8F0] flex items-center justify-center py-8 px-4 md:px-8 md:py-10`}>
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-stretch gap-8 lg:gap-10">
        {/* Left Image (Desktop only) */}
        <div className="relative hidden lg:block min-h-[480px] flex-1 overflow-hidden">
          <img
            src="/images/login.png"
            alt="Rangethnics ethnic wear"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </div>

        {/* Right Card Container */}
        <div className="flex w-full items-start justify-center lg:min-h-[480px] lg:w-[508px] lg:shrink-0 lg:justify-end">
          <Suspense fallback={
            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[32px] p-8 md:p-10 shadow-2xl border border-[#2b2622]/5 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-[#e8e1d9] border-t-[#b89b5e] rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2b2622]/40">Loading Form Parameters...</p>
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
