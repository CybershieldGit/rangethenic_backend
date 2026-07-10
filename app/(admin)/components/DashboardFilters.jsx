import React from "react";

export default function DashboardFilters({
  filterDays,
  setFilterDays,
  filterCategory,
  setFilterCategory,
  filterProduct,
  setFilterProduct,
  isDateOpen,
  setIsDateOpen,
  isCategoryOpen,
  setIsCategoryOpen,
  isProductOpen,
  setIsProductOpen,
  uniqueCategories,
  filteredProductsForDropdown,
  productAnalytics,
}) {
  return (
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
  );
}
