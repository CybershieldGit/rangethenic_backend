"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Noto_Serif } from "next/font/google";

const notoSerif = Noto_Serif({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-serif",
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005";

// --- Minimalist SVG Icons ---
const DashboardIcon = () => (
  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const ProductsIcon = () => (
  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const AddIcon = () => (
  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const OrdersIcon = () => (
  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);

const CouponsIcon = () => (
  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
  </svg>
);

const CategoriesIcon = () => (
  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
  </svg>
);

const SizeIcon = () => (
  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18M8 6v12" />
  </svg>
);

const ColorIcon = () => (
  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-3" />
  </svg>
);

const FabricIcon = () => (
  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18M6 6l12 12M6 18L18 6" />
  </svg>
);

const WorkIcon = () => (
  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Isolated Admin Auth States
  const [adminUser, setAdminUser] = useState(null);
  const [adminToken, setAdminToken] = useState(null);

  // Admin login/signup form states
  const [isAdminRegister, setIsAdminRegister] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  // Verify isolated admin session on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("adminToken");
    const storedUser = localStorage.getItem("adminUser");

    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.isAdmin === true) {
          setAdminToken(storedToken);
          setAdminUser(parsed);
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (e) {
        setIsAuthorized(false);
      }
    } else {
      setIsAuthorized(false);
    }
    setLoading(false);
  }, []);

  // Isolated Authentication Handler (isolated from customer session)
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const endpoint = isAdminRegister ? "/api/auth/admin/register" : "/api/auth/admin/login";
      const url = `${API_URL}${endpoint}`;

      const bodyData = isAdminRegister
        ? { name: formData.name, email: formData.email, password: formData.password }
        : { email: formData.email, password: formData.password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      const token = data.token;
      const userObj = data.user || data;

      if (!token) {
        throw new Error("No token returned from server");
      }

      // Verify Admin privileges
      if (userObj.isAdmin === true) {
        // Save to completely separate admin credentials
        localStorage.setItem("adminToken", token);
        localStorage.setItem("adminUser", JSON.stringify(userObj));

        setAdminToken(token);
        setAdminUser(userObj);
        setIsAuthorized(true);
      } else {
        throw new Error("This account does not have Admin privileges. Please use a valid Admin account.");
      }
    } catch (err) {
      setAuthError(err.message || "Authentication failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    setAdminToken(null);
    setAdminUser(null);
    setIsAuthorized(false);
    setFormData({ name: "", email: "", password: "" });
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const pathname = usePathname();
  const isActive = (path) => pathname === path;

  if (loading) {
    return (
      <div className={`${notoSerif.variable} admin-theme flex items-center justify-center min-h-screen bg-[#f7f6f1]`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#e8e1d9] border-t-[#b89b5e] rounded-full animate-spin"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2b2622]/40 animate-pulse">Authenticating Presence...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className={`${notoSerif.variable} admin-theme min-h-screen bg-[#f7f6f1] flex flex-col items-center justify-center p-6`}>
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[32px] p-8 md:p-10 shadow-2xl border border-[#2b2622]/5">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif text-[#2b2622] tracking-tighter leading-none">Rakaarituals</h2>
            <p className="text-[10px] text-[#6f6a65] uppercase font-black tracking-[0.3em] mt-3 bg-[#e8e1d9] inline-block px-3 py-1 rounded-full">Admin Gate</p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 bg-[#f8f5f2] p-1 rounded-2xl border border-[#2b2622]/5 mb-6">
            <button
              onClick={() => { setIsAdminRegister(false); setAuthError(""); }}
              className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${!isAdminRegister
                ? "bg-[#2b2622] text-white shadow-md cursor-pointer"
                : "text-[#6f6a65] hover:text-[#2b2622] cursor-pointer"
                }`}
            >
              Admin Login
            </button>
            <button
              onClick={() => { setIsAdminRegister(true); setAuthError(""); }}
              className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${isAdminRegister
                ? "bg-[#2b2622] text-white shadow-md cursor-pointer"
                : "text-[#6f6a65] hover:text-[#2b2622] cursor-pointer"
                }`}
            >
              Sign Up
            </button>
          </div>

          {authError && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl p-4 mb-6 font-medium italic">
              ⚠️ {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            {isAdminRegister && (
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-bold ml-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full bg-[#f8f5f2] border-0 rounded-xl px-4 py-3 text-sm text-[#2b2622] focus:ring-2 focus:ring-[#b89b5e]/20 transition-all outline-none italic placeholder:text-[#6f6a65]/40"
                  placeholder="Enter name"
                />
              </div>
            )}

            <div className="space-y-1.5 flex flex-col">
              <label className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-bold ml-1">Email Address</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full bg-[#f8f5f2] border-0 rounded-xl px-4 py-3 text-sm text-[#2b2622] focus:ring-2 focus:ring-[#b89b5e]/20 transition-all outline-none italic placeholder:text-[#6f6a65]/40"
                placeholder="Enter admin email"
              />
            </div>

            <div className="space-y-1.5 flex flex-col">
              <label className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-bold ml-1">Password</label>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="w-full bg-[#f8f5f2] border-0 rounded-xl px-4 py-3 text-sm text-[#2b2622] focus:ring-2 focus:ring-[#b89b5e]/20 transition-all outline-none italic placeholder:text-[#6f6a65]/40"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-[#b89b5e] hover:bg-[#2b2622] text-white font-bold uppercase tracking-[0.2em] text-xs rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer mt-4"
            >
              {authLoading ? "Verifying..." : isAdminRegister ? "Register Admin Account" : "Access Admin Panel"}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-bold hover:text-[#b89b5e] transition-colors"
            >
              ← Back to Temple
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const NavLink = ({ href, icon, children }) => (
    <Link
      href={href}
      onClick={() => setIsMobileMenuOpen(false)}
      className={`px-5 py-3.5 rounded-xl transition-all font-bold text-sm flex items-center gap-3.5 group ${isActive(href)
        ? "bg-[#2b2622] text-white shadow-lg"
        : "text-[#6f6a65] hover:bg-[#f7f6f1] hover:text-[#2b2622]"
        }`}
    >
      <span className={`transition-all ${isActive(href) ? "text-[#b89b5e] scale-110" : "text-[#6f6a65] group-hover:text-[#2b2622]"}`}>
        {icon}
      </span>
      {children}
    </Link>
  );

  return (
    <div className={`${notoSerif.variable} admin-theme min-h-screen bg-[#f7f6f1] flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden`}>

      {/* Mobile Sticky Header Bar */}
      <header className="lg:hidden w-full bg-[#e8e1d9] px-6 py-3 flex items-center justify-between border-b border-[#dcd4cb] sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-20 h-10 overflow-hidden flex items-center justify-center">
            <img
              src="/assets/images/rakaa_logo.png"
              alt="Rakaarituals Logo"
              className="w-full h-full object-contain scale-[1.7] origin-center"
            />
          </div>
          <span className="text-[8px] text-[#6f6a65] uppercase font-bold tracking-[0.2em] bg-[#dcd4cb] px-2 py-0.5 rounded-full">Admin Panel</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-[#2b2622] hover:bg-[#dcd4cb] rounded-lg transition-colors cursor-pointer"
        >
          {isMobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Sidebar Drawer container */}
      <aside className={`fixed top-[65px] bottom-0 lg:inset-y-0 left-0 w-72 bg-[#e8e1d9] p-8 flex flex-col gap-4 border-r border-[#dcd4cb] z-50 transition-transform duration-300 transform lg:rounded-none
        lg:translate-x-0 lg:static lg:h-screen lg:w-64 xl:w-72 lg:flex-shrink-0 lg:z-auto
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="hidden lg:block">
          <div className="w-full h-24 overflow-hidden flex items-center justify-center">
            <img
              src="/assets/images/rakaa_logo.png"
              alt="Rakaarituals Logo"
              className="w-full h-full object-contain scale-[1.7] origin-center"
            />
          </div>
        </div>

        <div className="flex-grow flex flex-col gap-6">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] font-black text-[#b89b5e] mb-4">Management</p>
            <nav className="flex flex-col gap-1.5">
              <NavLink href="/admin" icon={<DashboardIcon />}>Dashboard</NavLink>
              <NavLink href="/admin/products" icon={<ProductsIcon />}>Products</NavLink>
              <NavLink href="/admin/categories" icon={<CategoriesIcon />}>Categories</NavLink>
              <NavLink href="/admin/sizes" icon={<SizeIcon />}>Size</NavLink>
              <NavLink href="/admin/colors" icon={<ColorIcon />}>Color</NavLink>
              <NavLink href="/admin/fabrics" icon={<FabricIcon />}>Fabric</NavLink>
              <NavLink href="/admin/works" icon={<WorkIcon />}>Work</NavLink>
              <NavLink href="/admin/orders" icon={<OrdersIcon />}>Orders</NavLink>
              <NavLink href="/admin/coupons" icon={<CouponsIcon />}>Coupons</NavLink>
            </nav>
          </div>
        </div>

        {/* Dedicated Admin Logout at the very bottom */}
        <div className="pt-6 border-t border-[#dcd4cb]">
          <button
            onClick={() => {
              handleAdminLogout();
              setIsMobileMenuOpen(false);
            }}
            className="w-full px-5 py-3.5 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all text-[#6f6a65] text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3.5 cursor-pointer text-left"
          >
            <svg className="w-4 h-4 shrink-0 text-rose-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 sm:p-8 lg:p-14 bg-stone-50/30 w-full h-[calc(100vh-80px)] lg:h-full lg:overflow-y-auto overflow-y-auto">
        {children}
      </main>

    </div>
  );
}
