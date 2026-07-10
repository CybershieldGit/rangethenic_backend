import React from "react";

export default function SalesTrendChart({ loading, svgParams }) {
  return (
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
                    <text x={svgParams.paddingLeft - 12} y={y + 4} textAnchor="end" className="text-[8px] font-black text-[#6f6a65]/70 fill-current font-sans font-sans">
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
  );
}
