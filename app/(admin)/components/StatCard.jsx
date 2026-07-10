import React from "react";

export default function StatCard({ title, value, subtitle, prefix, loading }) {
  return (
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
}
