import React from "react";

export default function ExportReports({ downloadCSVReport }) {
  const handleDownload = (type) => {
    if (typeof downloadCSVReport === "function") {
      downloadCSVReport(type);
    } else {
      console.log(`Downloading report for ${type} (fallback)`);
    }
  };

  return (
    <div className="bg-white border border-[#dcd4cb] p-8 rounded-[40px] shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="font-bold text-[#2b2622] text-lg">Export Reports</h3>
        <p className="text-xs text-gray-400 mt-2">Download spreadsheets for offline records audit.</p>
      </div>
      <div className="space-y-2 mt-6">
        <button onClick={() => handleDownload("sales")} className="w-full py-3 bg-[#420001] hover:bg-[#2e0001] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer border-0">
          Export Sales CSV
        </button>
        <button onClick={() => handleDownload("products")} className="w-full py-3 bg-[#2b2622] hover:bg-[#b89b5e] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer border-0">
          Export Products CSV
        </button>
      </div>
    </div>
  );
}
