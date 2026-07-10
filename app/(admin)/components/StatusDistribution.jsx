import React from "react";

export default function StatusDistribution({ analytics }) {
  return (
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
  );
}
