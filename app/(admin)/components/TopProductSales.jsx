import React from "react";

export default function TopProductSales({ filteredProductsForDisplay, topPerformer, leastPerformer }) {
  return (
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
  );
}
