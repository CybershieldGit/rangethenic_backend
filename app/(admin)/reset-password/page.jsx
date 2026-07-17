"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Noto_Serif } from "next/font/google";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-serif",
});

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return window.location.origin;
  return "https://admin.rangethnics.com";
};

const API_URL = getApiUrl();

function Corner({ className }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute h-10 w-10 ${className}`}
      style={{
        backgroundColor: "#420001",
        WebkitMaskImage: "url(/corner_sqare.svg)",
        maskImage: "url(/corner_sqare.svg)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

function ForgotPasswordFlow() {
  const router = useRouter();

  // step: 'email' | 'otp' | 'password'
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const otpRefs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");
      setCooldown(data.resendTime || 60);
      setOtp(Array(6).fill(""));
      setStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/verify-reset-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "OTP verification failed");
      setResetToken(data.resetToken);
      setStep("password");
    } catch (err) {
      setError(err.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resendLoading) return;
    setError("");
    setResendLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "reset" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to resend OTP");
        if (data.cooldown) setCooldown(data.cooldown);
        return;
      }
      setCooldown(data.resendTime || 60);
      setOtp(Array(6).fill(""));
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err.message || "Failed to resend OTP");
    } finally {
      setResendLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reset password");
      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => router.push("/"), 2500);
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, raw) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array.from({ length: 6 }, (_, i) => pasted[i] || "");
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const titles = { email: "Forgot Password", otp: "Verify OTP", password: "Create New Password" };
  const subtitles = {
    email: "Enter your admin email to receive a reset code",
    otp: "Check your email for the verification code",
    password: "Please create a new password for your admin account",
  };

  return (
    <div className="relative mx-auto w-full max-w-[508px]">
      <div className="relative flex min-h-[480px] w-full flex-col border border-[#BD8A3C]/50 bg-[#FFF9F3] px-9 py-10">
        <div className="pointer-events-none absolute inset-3">
          <Corner className="left-0 top-0" />
          <Corner className="right-0 top-0 -scale-x-100" />
          <Corner className="left-0 bottom-0 -scale-y-100" />
          <Corner className="right-0 bottom-0 -scale-100" />
          <span className="absolute left-11 right-11 top-0 h-px bg-[#BD8A3C]/50" />
          <span className="absolute left-11 right-11 bottom-0 h-px bg-[#BD8A3C]/50" />
          <span className="absolute top-11 bottom-11 left-0 w-px bg-[#BD8A3C]/50" />
          <span className="absolute top-11 bottom-11 right-0 w-px bg-[#BD8A3C]/50" />
        </div>

        <div className="relative text-center">
          <h1 className="font-serif text-[36px] font-bold leading-tight text-[#420001]" style={{ fontFamily: "var(--font-noto-serif), Georgia, serif" }}>
            {titles[step]}
          </h1>
          <p className="mt-2 font-sans text-[16px] leading-relaxed text-[#8E8E8E]">{subtitles[step]}</p>
          <img src="/historical_seperator.svg" alt="" className="mx-auto mt-5 h-4 w-auto" />
        </div>

        <div className="relative mt-6 flex flex-1 flex-col">
          {error && (
            <div className="mb-5 flex items-center gap-3 bg-[#FF00001A] px-4 py-3">
              <AlertCircle size={28} className="mt-0.5 shrink-0 text-[#420001]" />
              <div className="text-left">
                <p className="font-sans text-sm font-semibold text-[#420001]">
                  {step === "otp" ? "Verification failed" : "Error"}
                </p>
                <p className="mt-0.5 font-sans text-[10px] text-[#420001]">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm p-4 font-medium">
              ✅ {success}
            </div>
          )}

          {/* STEP 1: Email */}
          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="flex flex-1 flex-col">
              <div className="relative w-full">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A89E96]">
                  <Mail size={17} strokeWidth={1.5} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your admin email"
                  className="h-[46px] w-full rounded-none border border-[#BD8A3C4D] bg-[#BD8A3C0A] font-sans text-sm text-[#4a3f38] placeholder:text-[#A89E96] focus:border-[#420001] focus:outline-none focus:ring-0 pl-10 pr-3.5"
                />
              </div>
              <div className="mt-5">
                <button
                  type="submit"
                  disabled={loading}
                  className="h-[46px] w-full rounded-none bg-[#420001] font-sans text-[16px] font-semibold tracking-wide text-white transition-colors hover:bg-[#2e0001] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer border-0"
                >
                  {loading ? "Sending OTP..." : "Send Reset Code"}
                </button>
              </div>
              <p className="mt-auto pt-6 text-center">
                <Link href="/" className="font-sans text-sm font-semibold text-[#420001] hover:underline">
                  ← Back to Login
                </Link>
              </p>
            </form>
          )}

          {/* STEP 2: OTP */}
          {step === "otp" && (
            <form onSubmit={handleOtpSubmit} className="flex flex-1 flex-col">
              <p className="mb-5 text-center font-sans text-sm leading-relaxed text-[#717171]">
                We sent a 6-digit code to <span className="font-semibold text-[#420001]">{email}</span>. Enter it below to continue.
              </p>
              <div className="flex justify-center gap-2 mb-5">
                {Array.from({ length: 6 }).map((_, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[index] || ""}
                    disabled={loading}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    className={`h-12 w-11 rounded-none border bg-[#BD8A3C0A] text-center font-sans text-base text-[#4a3f38] focus:outline-none focus:ring-0 disabled:opacity-60 ${
                      error ? "border-red-400 focus:border-red-400" : "border-[#BD8A3C4D] focus:border-[#420001]"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 mb-5">
                <span className="font-sans text-sm text-[#9a8f88]">Didn&apos;t receive the code?</span>
                {cooldown > 0 ? (
                  <span className="font-sans text-sm font-semibold text-[#420001]">
                    Resend OTP ({String(Math.floor(cooldown / 60)).padStart(2, "0")}:{String(cooldown % 60).padStart(2, "0")})
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="font-sans text-sm font-semibold text-[#420001] hover:underline disabled:opacity-60 cursor-pointer bg-transparent border-0 p-0"
                  >
                    {resendLoading ? "Sending..." : "Resend OTP"}
                  </button>
                )}
              </div>
              <div className="mt-auto">
                <button
                  type="submit"
                  disabled={loading}
                  className="h-[46px] w-full rounded-none bg-[#420001] font-sans text-[16px] font-semibold tracking-wide text-white transition-colors hover:bg-[#2e0001] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer border-0"
                >
                  {loading ? "Verifying..." : "Confirm OTP"}
                </button>
              </div>
              <p className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => { setStep("email"); setError(""); setOtp(Array(6).fill("")); }}
                  className="font-sans text-sm font-semibold text-[#420001] hover:underline cursor-pointer bg-transparent border-0 p-0"
                >
                  ← Back
                </button>
              </p>
            </form>
          )}

          {/* STEP 3: New password */}
          {step === "password" && !success && (
            <form onSubmit={handlePasswordSubmit} className="flex flex-1 flex-col space-y-3">
              <div>
                <div className="relative w-full">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A89E96]">
                    <Lock size={17} strokeWidth={1.5} />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="h-[46px] w-full rounded-none border border-[#BD8A3C4D] bg-[#BD8A3C0A] font-sans text-sm text-[#4a3f38] placeholder:text-[#A89E96] focus:border-[#420001] focus:outline-none focus:ring-0 pl-10 pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#A89E96] hover:text-[#420001] cursor-pointer bg-transparent border-0 p-0">
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </div>
                <p className="mt-2 text-left font-sans text-[11px] text-[#9A9088]">Use 8 or more characters with a mix of letters, numbers &amp; symbols.</p>
              </div>
              <div className="relative w-full">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A89E96]">
                  <Lock size={17} strokeWidth={1.5} />
                </span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="h-[46px] w-full rounded-none border border-[#BD8A3C4D] bg-[#BD8A3C0A] font-sans text-sm text-[#4a3f38] placeholder:text-[#A89E96] focus:border-[#420001] focus:outline-none focus:ring-0 pl-10 pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-[#A89E96] hover:text-[#420001] cursor-pointer bg-transparent border-0 p-0">
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="h-[46px] w-full rounded-none bg-[#420001] font-sans text-[16px] font-semibold tracking-wide text-white transition-colors hover:bg-[#2e0001] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer border-0"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className={`${notoSerif.variable} min-h-screen bg-[#FDF8F0] flex items-center justify-center py-8 px-4 md:px-8 md:py-10`}>
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-stretch gap-8 lg:gap-10">
        <div className="relative hidden lg:block min-h-[480px] flex-1 overflow-hidden">
          <img src="/images/login.png" alt="Rangethnics ethnic wear" className="absolute inset-0 h-full w-full object-cover object-center" />
        </div>
        <div className="flex w-full items-start justify-center lg:min-h-[480px] lg:w-[508px] lg:shrink-0 lg:justify-end">
          <Suspense fallback={<div className="flex flex-col items-center gap-4"><div className="w-10 h-10 border-4 border-[#e8e1d9] border-t-[#420001] rounded-full animate-spin"></div></div>}>
            <ForgotPasswordFlow />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
