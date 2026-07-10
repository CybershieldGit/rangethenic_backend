import React from "react";

export default function SmartInsights({ analytics }) {
  if (!analytics || !analytics.insights) return null;

  return (
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
  );
}
