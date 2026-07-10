"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  fetchDashboardAnalytics,
  fetchProductAnalytics,
  fetchAdminLogs,
} from "@/utils/api";
import { useSocket } from "@/context/SocketContext";

// Modular Dashboard Components
import StatCard from "./components/StatCard";
import DashboardFilters from "./components/DashboardFilters";
import SalesTrendChart from "./components/SalesTrendChart";
import StatusDistribution from "./components/StatusDistribution";
import RevenueStatistics from "./components/RevenueStatistics";
import PaymentMethodShare from "./components/PaymentMethodShare";
import CategoryShare from "./components/CategoryShare";
import TopProductSales from "./components/TopProductSales";
import SmartInsights from "./components/SmartInsights";
import ExportReports from "./components/ExportReports";

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

  // Placeholder for CSV exports
  const downloadCSVReport = (type) => {
    console.log(`Downloading report for ${type}`);
  };

  return (
    <div className="max-w-7xl mx-auto pb-16">
      {/* Upper Title Header */}
      <header className="mb-10 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div>
          <span className="text-[#b89b5e] font-black tracking-[0.5em] uppercase text-[10px] block mb-3">Store Analytics</span>
          <h1 className="text-5xl font-bold tracking-tighter text-[#2b2622] font-serif">Welcome Admin</h1>
        </div>

        <DashboardFilters
          filterDays={filterDays}
          setFilterDays={setFilterDays}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterProduct={filterProduct}
          setFilterProduct={setFilterProduct}
          isDateOpen={isDateOpen}
          setIsDateOpen={setIsDateOpen}
          isCategoryOpen={isCategoryOpen}
          setIsCategoryOpen={setIsCategoryOpen}
          isProductOpen={isProductOpen}
          setIsProductOpen={setIsProductOpen}
          uniqueCategories={uniqueCategories}
          filteredProductsForDropdown={filteredProductsForDropdown}
          productAnalytics={productAnalytics}
        />
      </header>

      {/* Core Dynamic Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
        <StatCard title="Sales" prefix="₹" value={analytics ? analytics.revenue.grossRevenue : 0} subtitle="Store Revenue" loading={loading} />
        <StatCard title="Available Stock" value={analytics ? analytics.inventory.totalStock : 0} subtitle="Product Inventory" loading={loading} />
        <StatCard title="Total Orders" value={analytics ? analytics.orders.total : 0} subtitle="Store Orders" loading={loading} />
        <StatCard title="Active Catalog" value={productAnalytics ? productAnalytics.length : 0} subtitle="Store Catalog" loading={loading} />
      </div>

      {/* Main Row: Sales Trend & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <SalesTrendChart loading={loading} svgParams={svgParams} />
        <StatusDistribution analytics={analytics} />
      </div>

      {/* Additional Analytics Stacked Rows (Graphs and Statistics) */}
      {analytics && (
        <div className="space-y-10">
          {/* Row 2: Revenue Distribution & COD vs Online Ratio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <RevenueStatistics analytics={analytics} />
            <PaymentMethodShare analytics={analytics} />
          </div>

          {/* Row 3: Product Performance & Category Share */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <CategoryShare analytics={analytics} />
            <TopProductSales
              filteredProductsForDisplay={filteredProductsForDisplay}
              topPerformer={topPerformer}
              leastPerformer={leastPerformer}
            />
          </div>

          {/* Row 4: AI Insights & Report Export Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <SmartInsights analytics={analytics} />
            <ExportReports downloadCSVReport={downloadCSVReport} />
          </div>
        </div>
      )}
    </div>
  );
}
