"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { fetchProducts, getAllOrders } from "@/utils/api";
import { useSocket } from "@/context/SocketContext";

export default function AdminDashboard() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState("all"); // "7", "30", "all"
  const [hoveredPoint, setHoveredPoint] = useState(null); // Active chart tooltip
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Custom selector card open state

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsData, ordersData] = await Promise.all([
          fetchProducts(),
          getAllOrders(),
        ]);
        setProducts(productsData.products || []);
        setOrders(ordersData || []);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleOrderCreated = (newOrder) => {
      setOrders((prevOrders) => {
        if (prevOrders.some((o) => o._id === newOrder._id)) return prevOrders;
        return [newOrder, ...prevOrders];
      });
    };

    const handleOrderUpdated = (updatedOrder) => {
      setOrders((prevOrders) =>
        prevOrders.map((ord) => (ord._id === updatedOrder._id ? updatedOrder : ord))
      );
    };

    socket.on("orderCreated", handleOrderCreated);
    socket.on("orderUpdated", handleOrderUpdated);

    return () => {
      socket.off("orderCreated", handleOrderCreated);
      socket.off("orderUpdated", handleOrderUpdated);
    };
  }, [socket]);

  // Handle global click to close dashboard filter dropdown when clicking outside
  useEffect(() => {
    const handleGlobalClick = (event) => {
      if (!event.target.closest(".dashboard-filter-container")) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleGlobalClick);
    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  // 1. Instantly filter orders reactively in local state
  const filteredOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    if (filterDays === "today") {
      return orders.filter((ord) => {
        const orderDate = new Date(ord.createdAt);
        return orderDate >= today;
      });
    }

    if (filterDays === "yesterday") {
      return orders.filter((ord) => {
        const orderDate = new Date(ord.createdAt);
        const tomorrowOfYesterday = new Date(yesterday);
        tomorrowOfYesterday.setDate(tomorrowOfYesterday.getDate() + 1);
        return orderDate >= yesterday && orderDate < tomorrowOfYesterday;
      });
    }

    if (filterDays === "all") return orders;

    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - Number(filterDays));
    return orders.filter((ord) => {
      const orderDate = new Date(ord.createdAt);
      return orderDate >= cutoff;
    });
  }, [orders, filterDays]);

  // 2. Derive dynamic stats based on filtered orders
  const stats = useMemo(() => {
    const totalSales = filteredOrders.reduce((acc, ord) => acc + (ord.totalPrice || 0), 0);
    const totalStock = products.reduce((acc, p) => acc + (Number(p.countInStock) || 0), 0);

    let delivered = 0;
    let dispatched = 0;
    let placed = 0;
    let cancelled = 0;

    filteredOrders.forEach((ord) => {
      const status = ord.deliveryStatus;
      if (status === "Delivered") delivered++;
      else if (status === "Dispatched") dispatched++;
      else if (status === "Cancelled") cancelled++;
      else placed++; // "Placed" or default status
    });

    return {
      totalSales,
      totalStock,
      totalOrders: filteredOrders.length,
      activeCatalog: products.length,
      delivered,
      dispatched,
      placed,
      cancelled,
    };
  }, [filteredOrders, products]);

  // 3. Generate mathematical coordinates for custom SVG Line Chart
  const chartData = useMemo(() => {
    if (loading) return [];

    if (filterDays === "today" || filterDays === "yesterday") {
      const data = [];
      const baseDate = new Date();
      if (filterDays === "yesterday") {
        baseDate.setDate(baseDate.getDate() - 1);
      }
      baseDate.setHours(0, 0, 0, 0);

      const hours = [0, 4, 8, 12, 16, 20];
      const labels = ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM"];

      hours.forEach((h, index) => {
        const start = new Date(baseDate);
        start.setHours(h, 0, 0, 0);
        const end = new Date(baseDate);
        end.setHours(h + 4, 0, 0, 0);

        const blockRevenue = filteredOrders
          .filter((ord) => {
            const d = new Date(ord.createdAt);
            return d >= start && d < end;
          })
          .reduce((sum, ord) => sum + (ord.totalPrice || 0), 0);

        data.push({
          label: labels[index],
          value: blockRevenue,
          fullDate: `${labels[index]} - ${index === labels.length - 1 ? "12 AM" : labels[index + 1]} (${baseDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`,
        });
      });
      return data;
    }

    if (filterDays === "7") {
      // Last 7 Daily Sales
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString("en-US", { weekday: "short" });
        const dateStr = d.toDateString();

        const dailyRevenue = filteredOrders
          .filter((ord) => new Date(ord.createdAt).toDateString() === dateStr)
          .reduce((sum, ord) => sum + (ord.totalPrice || 0), 0);

        data.push({ label, value: dailyRevenue, fullDate: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) });
      }
      return data;
    } else if (filterDays === "30") {
      // Last 30 Daily Sales
      const data = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
        const dateStr = d.toDateString();

        const dailyRevenue = filteredOrders
          .filter((ord) => new Date(ord.createdAt).toDateString() === dateStr)
          .reduce((sum, ord) => sum + (ord.totalPrice || 0), 0);

        data.push({ 
          label: dayStr, 
          value: dailyRevenue, 
          fullDate: d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) 
        });
      }
      return data;
    } else {
      // All time grouped by every single day starting from the first purchase date up to today!
      if (orders.length === 0) {
        const d = new Date();
        return [{
          label: d.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
          value: 0,
          fullDate: d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
        }];
      }

      // Find first purchase date
      const orderDates = orders.map((ord) => new Date(ord.createdAt).getTime());
      const minTimestamp = Math.min(...orderDates);
      const startDate = new Date(minTimestamp);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date();
      endDate.setHours(0, 0, 0, 0);

      const data = [];
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Loop through every day from startDate to endDate
      for (let i = 0; i <= diffDays; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dayStr = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
        const dateStr = d.toDateString();

        const dailyRevenue = filteredOrders
          .filter((ord) => new Date(ord.createdAt).toDateString() === dateStr)
          .reduce((sum, ord) => sum + (ord.totalPrice || 0), 0);

        data.push({
          label: dayStr,
          value: dailyRevenue,
          fullDate: d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
        });
      }
      return data;
    }
  }, [filteredOrders, filterDays, loading, orders]);

  // SVG Chart Calculations
  const svgParams = useMemo(() => {
    if (chartData.length === 0) return null;
    const maxVal = Math.max(...chartData.map((d) => d.value), 500);

    const width = 600;
    const height = 220;
    const paddingLeft = 60;
    const paddingRight = 30;
    const paddingTop = 25;
    const paddingBottom = 40;

    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    const points = chartData.map((d, i) => {
      const x = paddingLeft + (i / (chartData.length - 1 || 1)) * graphWidth;
      const y = height - paddingBottom - (d.value / maxVal) * graphHeight;
      return { x, y, value: d.value, label: d.label, fullDate: d.fullDate };
    });

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
      : "";

    return { width, height, paddingLeft, paddingRight, paddingTop, paddingBottom, graphWidth, graphHeight, points, linePath, areaPath, maxVal };
  }, [chartData]);

  // Dynamic status percentages
  const percentages = useMemo(() => {
    const total = stats.totalOrders || 1;
    return {
      placed: Math.round((stats.placed / total) * 100),
      dispatched: Math.round((stats.dispatched / total) * 100),
      delivered: Math.round((stats.delivered / total) * 100),
      cancelled: Math.round((stats.cancelled / total) * 100),
    };
  }, [stats]);

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
          <h3 className="text-4xl font-bold text-[#2b2622] tracking-tighter leading-none">
            {loading ? (
              <span className="inline-block w-20 h-9 bg-[#e8e1d9] animate-pulse rounded-xl"></span>
            ) : typeof value === "number" ? (
              value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
            ) : (
              value
            )}
          </h3>
        </div>
      </div>
      <p className="text-[10px] font-bold text-[#b89b5e] mt-4 opacity-80 group-hover:opacity-100 transition-all uppercase tracking-wider relative z-10">
        {subtitle}
      </p>
      {/* Decorative Background Element */}
      <div className="absolute -right-4 -bottom-4 text-8xl opacity-[0.03] group-hover:opacity-[0.07] transition-all group-hover:scale-110 rotate-12 select-none pointer-events-none font-black text-[#2b2622]">
        {title[0]}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-10">
      {/* Upper Title Header */}
      <header className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <span className="text-[#b89b5e] font-black tracking-[0.5em] uppercase text-[10px] block mb-3">Temple Analytics</span>
          <h1 className="text-5xl font-bold tracking-tighter text-[#2b2622]">Good Morning, Admin</h1>
        </div>

        {/* Days Filter Pills Group & Systems Indicator */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Custom Gold Filter Dropdown */}
          <div className="relative w-44 dashboard-filter-container">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="appearance-none bg-[#e8e1d9]/60 pl-5 pr-12 py-3.5 text-[10px] font-black uppercase tracking-widest text-[#2b2622] rounded-2xl border border-[#dcd4cb] shadow-sm backdrop-blur-md focus:outline-none focus:border-[#b89b5e] cursor-pointer transition-all duration-300 hover:bg-[#e8e1d9] font-sans flex items-center justify-between w-full"
            >
              <span>
                {filterDays === "today" ? "Today" :
                 filterDays === "yesterday" ? "Yesterday" :
                 filterDays === "7" ? "7 Days" :
                 filterDays === "30" ? "30 Days" : "All Time"}
              </span>
              <div 
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[#b89b5e] transition-transform duration-300 pointer-events-none"
                style={{ transform: isDropdownOpen ? "translateY(-50%) rotate(180deg)" : "translateY(-50%)" }}
              >
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>

            {/* Dynamic Options Overlay and Card Dropdown */}
            {isDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-[#e8e1d9] border border-[#dcd4cb] rounded-2xl p-1.5 shadow-[0_15px_40px_rgba(43,38,34,0.15)] w-full backdrop-blur-md flex flex-col gap-1 origin-top-right transition-all">
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
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
                      filterDays === opt.val
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

          <div className="bg-[#e8e1d9] px-5 py-3.5 rounded-2xl border border-[#dcd4cb] flex items-center gap-3.5 shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-[#2b2622]">Systems Live</span>
          </div>
        </div>
      </header>

      {/* Core Dynamic Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
        <StatCard title="Sales" prefix="₹" value={stats.totalSales} subtitle="Divine Revenue" />
        <StatCard title="Available Stock" value={stats.totalStock} subtitle="Sacred Inventory" />
        <StatCard title="Total Orders" value={stats.totalOrders} subtitle="Ritual Journeys" />
        <StatCard title="Active Catalog" value={stats.activeCatalog} subtitle="Sacred Offerings" />
      </div>

      {/* Analytics Graph & Order Status Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Sales Trend Line Graph Card */}
        <div className="lg:col-span-2 bg-white border border-[#dcd4cb] p-8 rounded-[40px] shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[380px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#b89b5e] mb-1">Ritual Revenue</p>
                <h2 className="text-3xl font-bold tracking-tighter text-[#2b2622]">Sales Trend</h2>
              </div>
              <span className="text-[9px] font-bold text-[#6f6a65] uppercase tracking-widest bg-[#f7f6f1] px-3 py-1 rounded-full border border-[#dcd4cb]">
                {filterDays === "7" ? "Daily" : filterDays === "30" ? "Weekly" : "Monthly"} Analytics
              </span>
            </div>
            <p className="text-xs text-[#6f6a65] max-w-sm mb-6 leading-relaxed">
              Real-time sales tracking plotted mathematically across selected time slices. Hover nodes to view accurate revenue totals.
            </p>
          </div>

          {/* SVG Custom Line Chart Area */}
          <div className="relative w-full flex-grow mt-4">
            {loading ? (
              <div className="w-full h-full bg-[#f8f6f2]/60 animate-pulse rounded-2xl flex items-center justify-center text-xs text-[#6f6a65] italic">
                Gathering celestial datasets...
              </div>
            ) : svgParams ? (
              <div className="relative w-full h-full min-h-[220px]">
                <svg
                  viewBox={`0 0 ${svgParams.width} ${svgParams.height}`}
                  className="w-full h-full overflow-visible"
                >
                  <defs>
                    {/* Glowing gold area gradient */}
                    <linearGradient id="salesChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#b89b5e" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#b89b5e" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                    const y = svgParams.paddingTop + pct * svgParams.graphHeight;
                    const val = svgParams.maxVal - pct * svgParams.maxVal;
                    return (
                      <g key={idx} className="opacity-40">
                        <line
                           x1={svgParams.paddingLeft}
                           y1={y}
                           x2={svgParams.width - svgParams.paddingRight}
                           y2={y}
                           stroke="#dcd4cb"
                           strokeWidth="1"
                           strokeDasharray="4 6"
                        />
                        <text
                           x={svgParams.paddingLeft - 12}
                           y={y + 4}
                           textAnchor="end"
                           className="text-[8px] font-black text-[#6f6a65]/70 fill-current"
                        >
                          ₹{val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area gradient under line */}
                  {svgParams.areaPath && (
                    <path d={svgParams.areaPath} fill="url(#salesChartGrad)" className="transition-all duration-700" />
                  )}

                  {/* Outline Trend Stroke */}
                  {svgParams.linePath && (
                    <path
                      d={svgParams.linePath}
                      fill="none"
                      stroke="#b89b5e"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-700"
                    />
                  )}

                  {/* Interaction Nodes & X labels */}
                  {svgParams.points.map((p, idx) => (
                    <g key={idx} className="group/node">
                      {/* Vertical highlight line on hover */}
                      {hoveredPoint === idx && (
                        <line
                          x1={p.x}
                          y1={svgParams.paddingTop}
                          x2={p.x}
                          y2={svgParams.height - svgParams.paddingBottom}
                          stroke="#2b2622"
                          strokeWidth="1.5"
                          strokeDasharray="2 3"
                        />
                      )}

                      {/* Dynamic X-Axis label */}
                      {(chartData.length <= 10 || idx % Math.ceil(chartData.length / 6) === 0 || idx === chartData.length - 1) && (
                        <text
                          x={p.x}
                          y={svgParams.height - 12}
                          textAnchor="middle"
                          className="text-[8px] font-black text-[#6f6a65]/80 fill-current font-sans"
                        >
                          {p.label}
                        </text>
                      )}

                      {/* Interactive hover hot-spot circle */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="12"
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPoint(idx)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />

                      {/* Aesthetic Node Point */}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={hoveredPoint === idx ? "7" : "4.5"}
                        fill={hoveredPoint === idx ? "#2b2622" : "#white"}
                        stroke="#b89b5e"
                        strokeWidth="2.5"
                        className="transition-all pointer-events-none"
                      />
                    </g>
                  ))}
                </svg>

                {/* Floating Tooltip Box */}
                {hoveredPoint !== null && svgParams.points[hoveredPoint] && (
                  <div
                    className="absolute bg-[#2b2622] text-[#f7f6f1] p-3 rounded-xl border border-white/10 shadow-2xl z-20 pointer-events-none transition-all duration-200"
                    style={{
                      left: `${(svgParams.points[hoveredPoint].x / svgParams.width) * 100}%`,
                      top: `${(svgParams.points[hoveredPoint].y / svgParams.height) * 100 - 35}%`,
                      transform: "translate(-50%, -100%)",
                    }}
                  >
                    <p className="text-[8px] text-[#b89b5e] uppercase tracking-widest font-black mb-0.5">
                      {svgParams.points[hoveredPoint].fullDate}
                    </p>
                    <p className="text-xs font-bold font-mono">
                      ₹{svgParams.points[hoveredPoint].value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-[#f8f6f2]/60 rounded-2xl flex items-center justify-center text-xs text-[#6f6a65] italic">
                No transaction records found in this cycle.
              </div>
            )}
          </div>
        </div>

        {/* Order Status Breakdowns Panel Card */}
        <div className="bg-white border border-[#dcd4cb] p-8 rounded-[40px] shadow-sm flex flex-col justify-between min-h-[380px]">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#b89b5e] mb-1">Fulfillment Metrics</p>
            <h2 className="text-3xl font-bold tracking-tighter text-[#2b2622] mb-4">Status Distribution</h2>
            <p className="text-xs text-[#6f6a65] leading-relaxed mb-6">
              Receipt breakdown mapped dynamically across the selected timeframe, displaying logistics progress.
            </p>
          </div>

          {/* Status Progress Indicator Columns */}
          <div className="flex flex-col gap-5 flex-grow justify-center">
            {/* 1. Delivered Status */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-[#2b2622] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                  Delivered
                </span>
                <span className="text-[#6f6a65] font-mono">
                  {stats.delivered} ({percentages.delivered}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${percentages.delivered}%` }}
                ></div>
              </div>
            </div>

            {/* 2. Dispatched Status */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-[#2b2622] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#b89b5e] rounded-full"></span>
                  Dispatched
                </span>
                <span className="text-[#6f6a65] font-mono">
                  {stats.dispatched} ({percentages.dispatched}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#b89b5e] rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${percentages.dispatched}%` }}
                ></div>
              </div>
            </div>

            {/* 3. Placed Status */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-[#2b2622] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-stone-400 rounded-full"></span>
                  Placed (Pending)
                </span>
                <span className="text-[#6f6a65] font-mono">
                  {stats.placed} ({percentages.placed}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-stone-400 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${percentages.placed}%` }}
                ></div>
              </div>
            </div>

            {/* 4. Cancelled Status */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-[#2b2622] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-rose-400 rounded-full"></span>
                  Cancelled
                </span>
                <span className="text-[#6f6a65] font-mono">
                  {stats.cancelled} ({percentages.cancelled}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-400 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${percentages.cancelled}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
