import React from "react";

export default function PaymentMethodShare({ analytics }) {
  if (!analytics) return null;

  return (
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
  );
}
