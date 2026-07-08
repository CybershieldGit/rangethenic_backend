"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  fetchDashboardAnalytics,
  fetchProductAnalytics,
  fetchAdminLogs,
} from "@/utils/api";
import { useSocket } from "@/context/SocketContext";

export default function AdminDashboard() {
  const router = useRouter();

  // Core Data States
  const [analytics, setAnalytics] = useState(null);
  const [productAnalytics, setProductAnalytics] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Global Filters & Date Range Preset
  const [filterDays, setFilterDays] = useState("all"); // "today", "yesterday", "7", "30", "all"
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterProduct, setFilterProduct] = useState("all");

  // Dropdown Open States
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isProductOpen, setIsProductOpen] = useState(false);

  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Load All Analytics
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      let resolvedFilters = {};
      const today = new Date();
      
      if (filterDays === "today") {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        resolvedFilters.startDate = start.toISOString();
        resolvedFilters.endDate = today.toISOString();
      } else if (filterDays === "yesterday") {
        const start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        resolvedFilters.startDate = start.toISOString();
        resolvedFilters.endDate = end.toISOString();
      } else if (filterDays === "7") {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        resolvedFilters.startDate = start.toISOString();
        resolvedFilters.endDate = today.toISOString();
      } else if (filterDays === "30") {
        const start = new Date();
        start.setDate(start.getDate() - 30);
        resolvedFilters.startDate = start.toISOString();
        resolvedFilters.endDate = today.toISOString();
      }

      if (filterCategory !== "all") {
        resolvedFilters.category = filterCategory;
      }
      if (filterProduct !== "all") {
        resolvedFilters.product = filterProduct;
      }

      const [dashData, prodData, logsData] = await Promise.all([
        fetchDashboardAnalytics(resolvedFilters),
        fetchProductAnalytics(),
        fetchAdminLogs(),
      ]);

      setAnalytics(dashData);
      setProductAnalytics(prodData);
      setAdminLogs(logsData);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [filterDays, filterCategory, filterProduct]);

  // Extract unique categories from analytics or products list
  const uniqueCategories = useMemo(() => {
    if (!analytics || !analytics.categories) return [];
    return analytics.categories.map(c => c.name);
  }, [analytics]);

  // Filter products dropdown options dynamically based on selected category
  const filteredProductsForDropdown = useMemo(() => {
    if (filterCategory === "all") return productAnalytics;
    return productAnalytics.filter(p => p.category === filterCategory);
  }, [productAnalytics, filterCategory]);

  const filteredProductsForDisplay = useMemo(() => {
    let list = productAnalytics;
    if (filterCategory !== "all") {
      list = list.filter(p => p.category === filterCategory);
    }
    if (filterProduct !== "all") {
      list = list.filter(p => p._id === filterProduct);
    }
    return list;
  }, [productAnalytics, filterCategory, filterProduct]);

  const { topPerformer, leastPerformer } = useMemo(() => {
    if (filteredProductsForDisplay.length === 0) return { topPerformer: null, leastPerformer: null };
    const sorted = [...filteredProductsForDisplay].sort((a, b) => b.purchases - a.purchases);
    return {
      topPerformer: sorted[0],
      leastPerformer: sorted.length > 1 ? sorted[sorted.length - 1] : null
    };
  }, [filteredProductsForDisplay]);

  // If selected category changes, check if the currently selected product is still valid
  useEffect(() => {
    if (filterProduct !== "all") {
      const isValid = filteredProductsForDropdown.some(p => p._id === filterProduct);
      if (!isValid) {
        setFilterProduct("all");
      }
    }
  }, [filterCategory, filteredProductsForDropdown, filterProduct]);

  // Realtime updates via Sockets
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    const handleOrderCreated = () => {
      loadDashboardData();
    };
    socket.on("orderCreated", handleOrderCreated);
    socket.on("orderUpdated", handleOrderCreated);
    return () => {
      socket.off("orderCreated", handleOrderCreated);
      socket.off("orderUpdated", handleOrderCreated);
    };
  }, [socket]);

  // Handle global click to close filter dropdowns when clicking outside
  useEffect(() => {
    const handleGlobalClick = (event) => {
      if (!event.target.closest(".date-filter-container")) setIsDateOpen(false);
      if (!event.target.closest(".category-filter-container")) setIsCategoryOpen(false);
      if (!event.target.closest(".product-filter-container")) setIsProductOpen(false);
    };
    document.addEventListener("click", handleGlobalClick);
    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  // SVG Chart Calculations for Sales Trend Line Graph
  const svgParams = useMemo(() => {
    if (!analytics) return null;
    const width = 600;
    const height = 220;
    const paddingLeft = 60;
    const paddingRight = 30;
    const paddingTop = 25;
    const paddingBottom = 40;
    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    const trendData = analytics.trend || [];

    const maxVal = Math.max(...trendData.map((d) => d.value), 500);

    const points = trendData.map((d, i) => {
      const x = paddingLeft + (i / (trendData.length - 1 || 1)) * graphWidth;
      const y = height - paddingBottom - (d.value / maxVal) * graphHeight;
      return { x, y, value: d.value, label: d.label };
    });

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
      : "";

    return { width, height, paddingLeft, paddingRight, paddingTop, paddingBottom, graphWidth, graphHeight, points, linePath, areaPath, maxVal };
  }, [analytics]);

  const StatCard = ({ title, value, subtitle, prefix }) => (
    <div className="bg-white p-7 rounded-[32px] border border-[#dcd4cb] hover:border-[#b89b5e] hover:shadow-[0_20px_50px_rgba(184,155,94,0.06)] transition-all duration-500 group relative overflow-hidden flex flex-col justify-between">
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#6f6a65]/60 mb-5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#b89b5e] rounded-full"></span>
          {title}
        </p>
        <div className="flex items-baseline gap-0.5">
          {prefix && !loading && (
            <span className="text-2xl font-bold text-[#b89b5e] tracking-tight">{prefix}</span>
          )}
          <h3 className="text-4xl font-bold text-[#2b2622] tracking-tight leading-none font-sans">
            {loading ? (
              <span className="inline-block w-20 h-9 bg-[#e8e1d9] animate-pulse rounded-xl"></span>
            ) : typeof value === "number" ? (
              value.toLocaleString("en-IN", { maximumFractionDigits: 0 })
            ) : (
              value
            )}
          </h3>
        </div>
      </div>
      <p className="text-[10px] font-bold text-[#b89b5e] mt-4 opacity-80 group-hover:opacity-100 transition-all uppercase tracking-wider relative z-10">
        {subtitle}
      </p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-16">
      {/* Upper Title Header */}
      <header className="mb-10 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <span className="text-[#b89b5e] font-black tracking-[0.5em] uppercase text-[10px] block mb-3">Store Analytics</span>
          <h1 className="text-5xl font-bold tracking-tighter text-[#2b2622] font-serif">Welcome Admin</h1>
        </div>

        {/* Dynamic Filters & Systems Indicator */}
        <div className="flex flex-wrap items-center gap-4 shrink-0">
          
          {/* 1. Time / Day Preset Filter */}
          <div className="relative w-40 date-filter-container">
            <button
              onClick={() => setIsDateOpen(!isDateOpen)}
              className="appearance-none bg-[#e8e1d9]/60 pl-5 pr-10 py-3 text-[10px] font-black uppercase tracking-widest text-[#2b2622] rounded-2xl border border-[#dcd4cb] shadow-sm backdrop-blur-md focus:outline-none focus:border-[#b89b5e] cursor-pointer transition-all duration-300 hover:bg-[#e8e1d9] font-sans flex items-center justify-between w-full"
            >
              <span>
                {filterDays === "today" ? "Today" :
                  filterDays === "yesterday" ? "Yesterday" :
                    filterDays === "7" ? "7 Days" :
                      filterDays === "30" ? "30 Days" : "All Time"}
              </span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b89b5e]">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>

            {isDateOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-[#e8e1d9] border border-[#dcd4cb] rounded-2xl p-1.5 shadow-[0_15px_40px_rgba(43,38,34,0.15)] w-full backdrop-blur-md flex flex-col gap-1">
                {[
                  { label: "Today", val: "today" },
                  { label: "Yesterday", val: "yesterday" },
                  { label: "7 Days", val: "7" },
                  { label: "30 Days", val: "30" },
                  { label: "All Time", val: "all" },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => {
                      setFilterDays(opt.val);
                      setIsDateOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${filterDays === opt.val
                      ? "bg-[#2b2622] text-white shadow-md scale-[1.03]"
                      : "text-[#6f6a65] hover:text-[#2b2622] hover:bg-white/40"
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Category Filter */}
          <div className="relative w-44 category-filter-container">
            <button
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className="appearance-none bg-[#e8e1d9]/60 pl-5 pr-10 py-3 text-[10px] font-black uppercase tracking-widest text-[#2b2622] rounded-2xl border border-[#dcd4cb] shadow-sm backdrop-blur-md focus:outline-none focus:border-[#b89b5e] cursor-pointer transition-all duration-300 hover:bg-[#e8e1d9] font-sans flex items-center justify-between w-full"
            >
              <span className="truncate">
                {filterCategory === "all" ? "All Categories" : filterCategory}
              </span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b89b5e]">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>

            {isCategoryOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-[#e8e1d9] border border-[#dcd4cb] rounded-2xl p-1.5 shadow-[0_15px_40px_rgba(43,38,34,0.15)] w-full backdrop-blur-md flex flex-col gap-1 max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    setFilterCategory("all");
                    setIsCategoryOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${filterCategory === "all"
                    ? "bg-[#2b2622] text-white shadow-md"
                    : "text-[#6f6a65] hover:text-[#2b2622] hover:bg-white/40"
                    }`}
                >
                  All Categories
                </button>
                {uniqueCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setFilterCategory(cat);
                      setIsCategoryOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${filterCategory === cat
                      ? "bg-[#2b2622] text-white shadow-md"
                      : "text-[#6f6a65] hover:text-[#2b2622] hover:bg-white/40"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. Product Filter */}
          <div className="relative w-52 product-filter-container">
            <button
              onClick={() => setIsProductOpen(!isProductOpen)}
              className="appearance-none bg-[#e8e1d9]/60 pl-5 pr-10 py-3 text-[10px] font-black uppercase tracking-widest text-[#2b2622] rounded-2xl border border-[#dcd4cb] shadow-sm backdrop-blur-md focus:outline-none focus:border-[#b89b5e] cursor-pointer transition-all duration-300 hover:bg-[#e8e1d9] font-sans flex items-center justify-between w-full"
            >
              <span className="truncate">
                {filterProduct === "all" ? "All Products" : (productAnalytics.find(p => p._id === filterProduct)?.name || "Selected Product")}
              </span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b89b5e]">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>

            {isProductOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-[#e8e1d9] border border-[#dcd4cb] rounded-2xl p-1.5 shadow-[0_15px_40px_rgba(43,38,34,0.15)] w-full backdrop-blur-md flex flex-col gap-1 max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    setFilterProduct("all");
                    setIsProductOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${filterProduct === "all"
                    ? "bg-[#2b2622] text-white shadow-md"
                    : "text-[#6f6a65] hover:text-[#2b2622] hover:bg-white/40"
                    }`}
                >
                  All Products
                </button>
                {filteredProductsForDropdown.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => {
                      setFilterProduct(p._id);
                      setIsProductOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${filterProduct === p._id
                      ? "bg-[#2b2622] text-white shadow-md"
                      : "text-[#6f6a65] hover:text-[#2b2622] hover:bg-white/40"
                      }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Systems Live Indicator */}
          <div className="bg-[#e8e1d9] px-5 py-3 rounded-2xl border border-[#dcd4cb] flex items-center gap-3.5 shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-[#2b2622]">Systems Live</span>
          </div>
        </div>
      </header>

      {/* Core Dynamic Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
        <StatCard title="Sales" prefix="₹" value={analytics ? analytics.revenue.grossRevenue : 0} subtitle="Store Revenue" />
        <StatCard title="Available Stock" value={analytics ? analytics.inventory.totalStock : 0} subtitle="Product Inventory" />
        <StatCard title="Total Orders" value={analytics ? analytics.orders.total : 0} subtitle="Store Orders" />
        <StatCard title="Active Catalog" value={productAnalytics ? productAnalytics.length : 0} subtitle="Store Catalog" />
      </div>

      {/* Main Row: Sales Trend & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Sales Trend Line Graph */}
        <div className="lg:col-span-2 bg-white border border-[#dcd4cb] p-8 rounded-[40px] shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#b89b5e] mb-1">Product Revenue</p>
                <h2 className="text-3xl font-bold tracking-tighter text-[#2b2622]">Sales Trend</h2>
              </div>
              <span className="text-[9px] font-bold text-[#6f6a65] uppercase tracking-widest bg-[#f7f6f1] px-3 py-1 rounded-full border border-[#dcd4cb]">
                Monthly Analytics
              </span>
            </div>
            <p className="text-xs text-[#6f6a65] max-w-sm mb-6 leading-relaxed">
              Real-time sales tracking plotted mathematically across selected time slices.
            </p>
          </div>

          <div className="relative w-full flex-grow mt-4">
            {loading ? (
              <div className="w-full h-full bg-[#f8f6f2]/60 animate-pulse rounded-2xl flex items-center justify-center text-xs text-[#6f6a65] italic">
                Gathering dataset...
              </div>
            ) : svgParams ? (
              <div className="relative w-full h-full min-h-[220px]">
                <svg viewBox={`0 0 ${svgParams.width} ${svgParams.height}`} className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="salesChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#b89b5e" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#b89b5e" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                    const y = svgParams.paddingTop + pct * svgParams.graphHeight;
                    const val = svgParams.maxVal - pct * svgParams.maxVal;
                    return (
                      <g key={idx} className="opacity-40">
                        <line x1={svgParams.paddingLeft} y1={y} x2={svgParams.width - svgParams.paddingRight} y2={y} stroke="#dcd4cb" strokeWidth="1" strokeDasharray="4 6" />
                        <text x={svgParams.paddingLeft - 12} y={y + 4} textAnchor="end" className="text-[8px] font-black text-[#6f6a65]/70 fill-current">
                          ₹{val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}

                  {svgParams.areaPath && <path d={svgParams.areaPath} fill="url(#salesChartGrad)" />}
                  {svgParams.linePath && <path d={svgParams.linePath} fill="none" stroke="#b89b5e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />}

                  {svgParams.points.map((p, idx) => (
                    <g key={idx}>
                      <text x={p.x} y={svgParams.height - 12} textAnchor="middle" className="text-[8px] font-black text-[#6f6a65]/80 fill-current font-sans">
                        {p.label}
                      </text>
                      <circle cx={p.x} cy={p.y} r="4.5" fill="white" stroke="#b89b5e" strokeWidth="2.5" />
                    </g>
                  ))}
                </svg>
              </div>
            ) : null}
          </div>
        </div>

        {/* Fulfillment Metrics Status Distribution */}
        <div className="bg-white border border-[#dcd4cb] p-8 rounded-[40px] shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#b89b5e] mb-1">Fulfillment Metrics</p>
            <h2 className="text-3xl font-bold tracking-tighter text-[#2b2622] mb-4">Status Distribution</h2>
            <p className="text-xs text-[#6f6a65] leading-relaxed mb-6">
              Receipt breakdown mapped dynamically across logistics progress.
            </p>
          </div>

          <div className="flex flex-col gap-5 flex-grow justify-center">
            {["Delivered", "Dispatched", "Placed", "Cancelled"].map((status) => {
              const count = analytics ? (analytics.orders.statusCounts[status] || 0) : 0;
              const total = analytics ? (analytics.orders.total || 1) : 1;
              const pct = Math.round((count / total) * 100);
              const colorMap = {
                Delivered: "bg-green-500",
                Dispatched: "bg-[#b89b5e]",
                Placed: "bg-stone-400",
                Cancelled: "bg-rose-400",
              };
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-[#2b2622] flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${colorMap[status]}`}></span>
                      {status === "Placed" ? "Placed (Pending)" : status}
                    </span>
                    <span className="text-[#6f6a65] font-mono">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-1000 ${colorMap[status]}`} style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Additional Analytics Stacked Rows (Graphs and Statistics) */}
      {analytics && (
        <div className="space-y-10">
          
          {/* Row 2: Revenue Distribution & COD vs Online Ratio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-[#dcd4cb] p-8 rounded-[40px] shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#b89b5e] mb-1">Financial Analysis</p>
              <h3 className="text-2xl font-bold text-[#2b2622] mb-6">Revenue Statistics</h3>
              <div className="w-full h-52 flex items-end justify-around bg-stone-50/50 p-6 rounded-3xl border border-[#dcd4cb]">
                {[
                  { label: "Gross Sales", value: analytics.revenue.grossRevenue, color: "#2b2622" },
                  { label: "COGS", value: analytics.revenue.estimatedCOGS, color: "#b89b5e" },
                  { label: "Net Revenue", value: analytics.revenue.netRevenue, color: "#6f6a65" },
                  { label: "Net Profit", value: analytics.revenue.netProfit, color: "#16a34a" },
                ].map((item, idx) => {
                  const maxVal = Math.max(analytics.revenue.grossRevenue, 1000);
                  const pctHeight = (item.value / maxVal) * 100;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 w-16">
                      <div className="w-full bg-stone-200 rounded-lg overflow-hidden h-32 flex items-end">
                        <div className="w-full rounded-t-lg transition-all duration-1000" style={{ height: `${pctHeight}%`, backgroundColor: item.color }}></div>
                      </div>
                      <span className="text-[8px] font-bold text-center text-gray-500 uppercase">{item.label}</span>
                      <span className="text-[9px] font-bold font-mono">₹{Math.round(item.value / 1000)}k</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-[#dcd4cb] p-8 rounded-[40px] shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#b89b5e] mb-1">Transaction Methods</p>
                <h3 className="text-2xl font-bold text-[#2b2622] mb-4">COD vs Online Payment</h3>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-8 flex-grow justify-center">
                <div className="w-36 h-36 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.91" fill="transparent" stroke="#f1ece5" strokeWidth="4" />
                    {(() => {
                      const total = analytics.orders.total || 1;
                      const onlinePct = (analytics.orders.onlineCount / total) * 100;
                      return (
                        <circle cx="18" cy="18" r="15.91" fill="transparent" stroke="#b89b5e" strokeWidth="4" strokeDasharray={`${onlinePct} ${100 - onlinePct}`} strokeDashoffset="25" />
                      );
                    })()}
                  </svg>
                </div>
                <div className="text-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 bg-[#b89b5e] rounded-full"></span>
                    <span className="font-bold">Online Payments: {analytics.orders.onlineCount}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 bg-[#f1ece5] border border-[#dcd4cb] rounded-full"></span>
                    <span className="font-bold text-gray-500">COD Payments: {analytics.orders.codCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Product Performance & Category Share */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border border-[#dcd4cb] p-8 rounded-[40px] shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#b89b5e] mb-1">Acquisitions</p>
              <h3 className="text-2xl font-bold text-[#2b2622] mb-6">Category Allocation Share</h3>
              <div className="w-full h-52 flex items-end justify-around bg-stone-50/50 p-6 rounded-3xl border border-[#dcd4cb]">
                {analytics.categories.map((cat, idx) => {
                  const totalRev = analytics.categories.reduce((acc, c) => acc + c.revenue, 1);
                  const pctShare = (cat.revenue / totalRev) * 100;
                  return (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <div className="w-12 bg-stone-200 h-28 rounded-lg flex items-end overflow-hidden">
                        <div className="w-full bg-[#b89b5e] transition-all" style={{ height: `${pctShare}%` }}></div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-600">{cat.name}</span>
                      <span className="text-[9px] font-bold font-mono">{pctShare.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-[#dcd4cb] p-8 rounded-[40px] shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#b89b5e] mb-1">Audits & Activity</p>
              <h3 className="text-2xl font-bold text-[#2b2622] mb-4">Top Product Sales</h3>
              
              {/* Top and Least Performing Stats Section */}
              <div className="flex flex-col sm:flex-row justify-between gap-2.5 mb-6 border-b border-[#e9e8e3] pb-4 text-[10px] font-bold uppercase tracking-wider">
                {topPerformer && (
                  <div className="text-green-800 bg-green-50 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-green-200">
                    <span>Top:</span>
                    <span className="text-[#2b2622] normal-case">{topPerformer.name}</span>
                    <span className="font-mono">({topPerformer.purchases} Sales)</span>
                  </div>
                )}
                {leastPerformer && (
                  <div className="text-rose-800 bg-rose-50 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-rose-200">
                    <span>Least:</span>
                    <span className="text-[#2b2622] normal-case">{leastPerformer.name}</span>
                    <span className="font-mono">({leastPerformer.purchases} Sales)</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {filteredProductsForDisplay.slice(0, 4).map((p, idx) => {
                  const isTop = topPerformer && p._id === topPerformer._id;
                  const isLeast = leastPerformer && p._id === leastPerformer._id;
                  const maxPurchases = topPerformer?.purchases || 1;
                  const pct = Math.round((p.purchases / maxPurchases) * 100);
                  return (
                    <div key={idx} className="text-xs">
                      <div className="flex justify-between font-bold mb-1 text-gray-700">
                        <span className="flex items-center gap-1.5">
                          {p.name}
                          {isTop && <span className="text-[9px] px-1.5 py-0.5 bg-green-100 text-green-800 rounded font-black">TOP</span>}
                          {isLeast && <span className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-black">LEAST</span>}
                        </span>
                        <span>{p.purchases} sales</span>
                      </div>
                      <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-[#b89b5e] h-full transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 4: AI Insights & Report Export Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 bg-[#FFFDF9] border border-[#dcd4cb] p-8 rounded-[40px] shadow-sm">
              <h3 className="font-bold text-[#2b2622] mb-4 text-lg">Smart AI Business Insights</h3>
              <div className="space-y-3">
                {analytics.insights.map((insight, idx) => (
                  <div key={idx} className={`p-4 rounded-xl flex items-start gap-3 border text-xs font-semibold ${
                    insight.type === "danger" ? "bg-rose-50 border-rose-200 text-rose-900" :
                    insight.type === "warning" ? "bg-amber-50 border-amber-200 text-amber-900" :
                    insight.type === "success" ? "bg-green-50 border-green-200 text-green-900" :
                    "bg-blue-50 border-blue-200 text-blue-900"
                  }`}>
                    <span className="text-base">
                      {insight.type === "danger" ? "[ALERT]" : insight.type === "warning" ? "[WARN]" : insight.type === "success" ? "[GROWTH]" : "[INFO]"}
                    </span>
                    <p>{insight.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#dcd4cb] p-8 rounded-[40px] shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-[#2b2622] text-lg">Export Reports</h3>
                <p className="text-xs text-gray-400 mt-2">Download spreadsheets for offline records audit.</p>
              </div>
              <div className="space-y-2 mt-6">
                <button onClick={() => downloadCSVReport("sales")} className="w-full py-3 bg-[#420001] hover:bg-[#2e0001] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer border-0">
                  Export Sales CSV
                </button>
                <button onClick={() => downloadCSVReport("products")} className="w-full py-3 bg-[#2b2622] hover:bg-[#b89b5e] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer border-0">
                  Export Products CSV
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
