import React, { useMemo } from "react";

export default function RevenueStatistics({ analytics }) {
  if (!analytics) return null;

  const trendData = analytics.trend || [];
  const trendKeys = analytics.trendKeys || [];

  // Define colors for the different categories/products
  const colors = [
    "#b89b5e", // Gold/brown
    "#420001", // Maroon
    "#2b2622", // Charcoal
    "#16a34a", // Green
    "#2563eb", // Blue
    "#d97706", // Amber
    "#7c3aed", // Violet
    "#db2777", // Pink
  ];

  const svgParams = useMemo(() => {
    if (trendData.length === 0) return null;

    const width = 600;
    const height = 220;
    const paddingLeft = 60;
    const paddingRight = 30;
    const paddingTop = 25;
    const paddingBottom = 40;
    const graphWidth = width - paddingLeft - paddingRight;
    const graphHeight = height - paddingTop - paddingBottom;

    // Find the maximum value across all keys and all trend points
    let maxVal = 500;
    trendData.forEach((d) => {
      trendKeys.forEach((key) => {
        const val = d.values?.[key] || 0;
        if (val > maxVal) {
          maxVal = val;
        }
      });
    });

    const seriesPaths = trendKeys.map((key, idx) => {
      const points = trendData.map((d, i) => {
        const x = paddingLeft + (i / (trendData.length - 1 || 1)) * graphWidth;
        const val = d.values?.[key] || 0;
        const y = height - paddingBottom - (val / maxVal) * graphHeight;
        return { x, y, val };
      });

      const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
      return {
        key,
        color: colors[idx % colors.length],
        points,
        linePath,
      };
    });

    return {
      width,
      height,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      graphWidth,
      graphHeight,
      maxVal,
      seriesPaths,
    };
  }, [trendData, trendKeys]);

  return (
    <div className="bg-white border border-[#dcd4cb] p-8 rounded-[40px] shadow-sm flex flex-col justify-between min-h-[380px]">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#b89b5e] mb-1">Sales Analysis</p>
            <h3 className="text-2xl font-bold text-[#2b2622]">Sales Comparison</h3>
          </div>
          <span className="text-[9px] font-bold text-[#6f6a65] uppercase tracking-widest bg-[#f7f6f1] px-3 py-1 rounded-full border border-[#dcd4cb]">
            Dynamic Plot
          </span>
        </div>
        <p className="text-xs text-[#6f6a65] mb-4 leading-relaxed">
          Comparing sales distribution dynamically based on your category or product filter.
        </p>

        {/* Legend */}
        {trendKeys.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
            {trendKeys.map((key, idx) => (
              <div key={key} className="flex items-center gap-1.5 text-[10px] font-bold text-[#6f6a65]">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: colors[idx % colors.length] }}
                ></span>
                <span className="truncate max-w-[120px]">{key}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative w-full flex-grow mt-2">
        {svgParams ? (
          <div className="relative w-full h-full min-h-[220px]">
            <svg viewBox={`0 0 ${svgParams.width} ${svgParams.height}`} className="w-full h-full overflow-visible">
              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = svgParams.paddingTop + pct * svgParams.graphHeight;
                const val = svgParams.maxVal - pct * svgParams.maxVal;
                return (
                  <g key={idx} className="opacity-40">
                    <line
                      x1={svgParams.paddingLeft}
                      y1={y}
                      x2={svgParams.width - svgParams.paddingRight}
                      y2={y}
                      stroke="#dcd4cb"
                      strokeWidth="1"
                      strokeDasharray="4 6"
                    />
                    <text
                      x={svgParams.paddingLeft - 12}
                      y={y + 4}
                      textAnchor="end"
                      className="text-[8px] font-black text-[#6f6a65]/70 fill-current font-sans"
                    >
                      ₹{val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
                    </text>
                  </g>
                );
              })}

              {/* Draw Series Lines */}
              {svgParams.seriesPaths.map((series, sIdx) => (
                <g key={series.key}>
                  {series.linePath && (
                    <path
                      d={series.linePath}
                      fill="none"
                      stroke={series.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {series.points.map((p, idx) => (
                    <g key={idx}>
                      {sIdx === 0 && (
                        <text
                          x={p.x}
                          y={svgParams.height - 12}
                          textAnchor="middle"
                          className="text-[8px] font-black text-[#6f6a65]/80 fill-current font-sans"
                        >
                          {trendData[idx]?.label}
                        </text>
                      )}
                      <circle cx={p.x} cy={p.y} r="3" fill="white" stroke={series.color} strokeWidth="2" />
                    </g>
                  ))}
                </g>
              ))}
            </svg>
          </div>
        ) : (
          <div className="w-full h-full bg-[#f8f6f2]/60 animate-pulse rounded-2xl flex items-center justify-center text-xs text-[#6f6a65] italic">
            Gathering dataset...
          </div>
        )}
      </div>
    </div>
  );
}
