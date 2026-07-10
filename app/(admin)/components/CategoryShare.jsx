import React from "react";

export default function CategoryShare({ analytics }) {
  if (!analytics) return null;

  return (
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
  );
}
