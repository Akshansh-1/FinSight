import React, { useState, useMemo } from "react";
import {
  PieChart,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Layers,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Info,
  Sparkles
} from "lucide-react";
import { JournalEntry, RecurringBudget } from "../types";
import { formatCurrency } from "../lib/currencies";

interface FinancialChartsHubProps {
  entries: JournalEntry[];
  budgets: RecurringBudget[];
  homeCurrency: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; stroke: string; text: string; hex: string }> = {
  "Food & Dining": { bg: "bg-[#D97736]", stroke: "#D97736", text: "text-[#D97736]", hex: "#D97736" },
  "Housing & Rent": { bg: "bg-[#2A6F97]", stroke: "#2A6F97", text: "text-[#2A6F97]", hex: "#2A6F97" },
  "Transportation": { bg: "bg-[#C48E28]", stroke: "#C48E28", text: "text-[#C48E28]", hex: "#C48E28" },
  "Utilities & Bills": { bg: "bg-[#3D8D7A]", stroke: "#3D8D7A", text: "text-[#3D8D7A]", hex: "#3D8D7A" },
  "Entertainment & Subscriptions": { bg: "bg-[#7A5C96]", stroke: "#7A5C96", text: "text-[#7A5C96]", hex: "#7A5C96" },
  "Shopping & Personal": { bg: "bg-[#BF5B75]", stroke: "#BF5B75", text: "text-[#BF5B75]", hex: "#BF5B75" },
  "Healthcare & Fitness": { bg: "bg-[#2D8B57]", stroke: "#2D8B57", text: "text-[#2D8B57]", hex: "#2D8B57" },
  "Savings & Investments": { bg: "bg-[#257180]", stroke: "#257180", text: "text-[#257180]", hex: "#257180" },
  "Education & Professional": { bg: "bg-[#486382]", stroke: "#486382", text: "text-[#486382]", hex: "#486382" },
  "Travel & Leisure": { bg: "bg-[#3F7C85]", stroke: "#3F7C85", text: "text-[#3F7C85]", hex: "#3F7C85" },
  "Financial Reflection": { bg: "bg-[#5D7A68]", stroke: "#5D7A68", text: "text-[#5D7A68]", hex: "#5D7A68" },
  "Miscellaneous": { bg: "bg-[#6E8276]", stroke: "#6E8276", text: "text-[#6E8276]", hex: "#6E8276" },
};

type ChartTab = "donut" | "timeline" | "mindset" | "budget_utilization" | "bars";

export const FinancialChartsHub: React.FC<FinancialChartsHubProps> = ({
  entries,
  budgets,
  homeCurrency,
}) => {
  const [activeTab, setActiveTab] = useState<ChartTab>("donut");
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Filter expense entries
  const expenseEntries = useMemo(() => {
    return entries.filter(
      (e) => e.analysis.entry_type === "expense" && e.analysis.converted_amount > 0
    );
  }, [entries]);

  // Aggregate category totals
  const { categoryData, totalSpend } = useMemo(() => {
    const totals: Record<string, { amount: number; count: number }> = {};
    let sum = 0;

    expenseEntries.forEach((entry) => {
      const cat = entry.analysis.category || "Miscellaneous";
      const amt = entry.analysis.converted_amount || 0;
      if (!totals[cat]) {
        totals[cat] = { amount: 0, count: 0 };
      }
      totals[cat].amount += amt;
      totals[cat].count += 1;
      sum += amt;
    });

    const sorted = Object.entries(totals)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: sum > 0 ? (data.amount / sum) * 100 : 0,
        hex: CATEGORY_COLORS[category]?.hex || "#5D7A68",
      }))
      .sort((a, b) => b.amount - a.amount);

    return { categoryData: sorted, totalSpend: sum };
  }, [expenseEntries]);

  // Daily Spending Timeline (Last 7 or 14 days)
  const timelineData = useMemo(() => {
    const daysMap: Record<string, { dateStr: string; label: string; amount: number; count: number }> = {};
    const now = new Date();

    // Last 7 days slots
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString(undefined, { weekday: "short" });
      const monthDay = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      daysMap[key] = { dateStr: key, label: `${dayName} ${monthDay}`, amount: 0, count: 0 };
    }

    expenseEntries.forEach((entry) => {
      const dateKey = new Date(entry.createdAt || entry.timestamp).toISOString().split("T")[0];
      if (daysMap[dateKey]) {
        daysMap[dateKey].amount += entry.analysis.converted_amount || 0;
        daysMap[dateKey].count += 1;
      }
    });

    const list = Object.values(daysMap);
    const maxVal = Math.max(...list.map((d) => d.amount), 50);
    return { list, maxVal };
  }, [expenseEntries]);

  // Mindset & Flag Distribution
  const flagDistribution = useMemo(() => {
    const counts = {
      on_track: 0,
      savings_opportunity: 0,
      overspend_risk: 0,
      informational: 0,
    };
    entries.forEach((entry) => {
      const f = entry.analysis.flag;
      if (f in counts) {
        counts[f as keyof typeof counts]++;
      } else {
        counts.informational++;
      }
    });
    const totalEntries = entries.length || 1;
    return {
      on_track: { count: counts.on_track, pct: (counts.on_track / totalEntries) * 100 },
      savings_opportunity: { count: counts.savings_opportunity, pct: (counts.savings_opportunity / totalEntries) * 100 },
      overspend_risk: { count: counts.overspend_risk, pct: (counts.overspend_risk / totalEntries) * 100 },
      informational: { count: counts.informational, pct: (counts.informational / totalEntries) * 100 },
      total: entries.length,
    };
  }, [entries]);

  // Budget Utilization
  const budgetUtilization = useMemo(() => {
    return budgets.map((b) => {
      // Find expenses in matching category
      const spent = expenseEntries
        .filter((e) => {
          if (b.category && e.analysis.category) {
            return e.analysis.category.toLowerCase() === b.category.toLowerCase();
          }
          return (
            e.text.toLowerCase().includes(b.label.toLowerCase()) ||
            (e.analysis.suggested_budget &&
              e.analysis.suggested_budget.label.toLowerCase() === b.label.toLowerCase())
          );
        })
        .reduce((sum, e) => sum + (e.analysis.converted_amount || 0), 0);

      const ratio = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      return {
        ...b,
        actualSpent: spent,
        ratio: Math.min(100, ratio),
        isOver: spent > b.amount,
      };
    });
  }, [budgets, expenseEntries]);

  // Donut Arc calculation helper
  const donutArcs = useMemo(() => {
    if (totalSpend === 0 || categoryData.length === 0) return [];
    const size = 160;
    const center = size / 2;
    const radius = 62;
    const innerRadius = 42;

    let cumulativeAngle = 0;
    return categoryData.map((item) => {
      const angle = (item.amount / totalSpend) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle = endAngle;

      const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
      const x1 = center + radius * Math.cos(toRad(startAngle));
      const y1 = center + radius * Math.sin(toRad(startAngle));
      const x2 = center + radius * Math.cos(toRad(endAngle));
      const y2 = center + radius * Math.sin(toRad(endAngle));

      const ix1 = center + innerRadius * Math.cos(toRad(endAngle));
      const iy1 = center + innerRadius * Math.sin(toRad(endAngle));
      const ix2 = center + innerRadius * Math.cos(toRad(startAngle));
      const iy2 = center + innerRadius * Math.sin(toRad(startAngle));

      const largeArc = angle > 180 ? 1 : 0;
      const pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

      return {
        ...item,
        pathData,
        startAngle,
        endAngle,
      };
    });
  }, [categoryData, totalSpend]);

  return (
    <div className="bg-white border border-[#8FA899]">
      {/* Systematic Header */}
      <div className="bg-[#EDF3EF] border-b border-[#8FA899] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-tech text-xs uppercase tracking-wider font-bold text-[#13241A]">
            [04] SPENDING TRENDS
          </span>
          <span className="w-1.5 h-1.5 bg-[#2D6A4F] inline-block"></span>
          <span className="font-mono text-[9px] text-[#526E5D] uppercase">
            PARITY: {homeCurrency}
          </span>
        </div>

        {/* Chart View Switcher */}
        <div className="flex items-center gap-1 overflow-x-auto font-tech text-[10px] uppercase tracking-wider font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("donut")}
            className={`flex items-center gap-1.5 px-2.5 py-1 transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "donut"
                ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                : "bg-white border-[#8FA899] text-[#13241A] hover:bg-[#EDF3EF]"
            }`}
          >
            <PieChart className="w-3 h-3" />
            <span>[DONUT]</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-1.5 px-2.5 py-1 transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "timeline"
                ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                : "bg-white border-[#8FA899] text-[#13241A] hover:bg-[#EDF3EF]"
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>[TIMELINE]</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("mindset")}
            className={`flex items-center gap-1.5 px-2.5 py-1 transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "mindset"
                ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                : "bg-white border-[#8FA899] text-[#13241A] hover:bg-[#EDF3EF]"
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>[STANCE]</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("budget_utilization")}
            className={`flex items-center gap-1.5 px-2.5 py-1 transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "budget_utilization"
                ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                : "bg-white border-[#8FA899] text-[#13241A] hover:bg-[#EDF3EF]"
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>[CAPS]</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bars")}
            className={`flex items-center gap-1.5 px-2.5 py-1 transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "bars"
                ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                : "bg-white border-[#8FA899] text-[#13241A] hover:bg-[#EDF3EF]"
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            <span>[RANKING]</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {/* Tab 1: Donut Chart & Category Breakdown */}
        {activeTab === "donut" && (
          <div>
            {categoryData.length === 0 ? (
              <div className="text-center py-12 font-mono text-xs text-[#16241C]/60">
                No expenses logged yet. Record your first expense reflection above!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* SVG Donut */}
                <div className="md:col-span-5 flex flex-col items-center justify-center relative">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                      {donutArcs.map((arc) => (
                        <path
                          key={arc.category}
                          d={arc.pathData}
                          fill={arc.hex}
                          opacity={
                            hoveredCategory === null || hoveredCategory === arc.category
                              ? 1
                              : 0.35
                          }
                          className="transition-all duration-200 cursor-pointer hover:opacity-100"
                          onMouseEnter={() => setHoveredCategory(arc.category)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        />
                      ))}
                    </svg>

                    {/* Donut Center Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
                      <span className="font-mono text-[9px] text-[#16241C]/60 uppercase tracking-wider font-semibold">
                        {hoveredCategory || "Total Outflow"}
                      </span>
                      <span className="font-serif text-lg font-normal text-[#16241C] mt-0.5 leading-tight">
                        {hoveredCategory
                          ? formatCurrency(
                              categoryData.find((c) => c.category === hoveredCategory)?.amount ||
                                0,
                              homeCurrency
                            )
                          : formatCurrency(totalSpend, homeCurrency)}
                      </span>
                      {hoveredCategory && (
                        <span className="font-mono text-[10px] text-[#2E7D52] font-semibold">
                          {(
                            categoryData.find((c) => c.category === hoveredCategory)
                              ?.percentage || 0
                          ).toFixed(1)}
                          %
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="md:col-span-7 space-y-2 max-h-56 overflow-y-auto pr-1">
                  {categoryData.map((item) => (
                    <div
                      key={item.category}
                      onMouseEnter={() => setHoveredCategory(item.category)}
                      onMouseLeave={() => setHoveredCategory(null)}
                      className={`flex items-center justify-between p-2 border text-xs transition-all cursor-pointer ${
                        hoveredCategory === item.category
                          ? "bg-[#16241C]/5 border-[#16241C]"
                          : "bg-white border-[#16241C]/20 hover:border-[#16241C]/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 shrink-0"
                          style={{ backgroundColor: item.hex }}
                        />
                        <span className="font-medium text-[#16241C] truncate max-w-[140px] sm:max-w-[180px]">
                          {item.category}
                        </span>
                        <span className="font-mono text-[10px] text-[#16241C]/60">
                          ({item.count})
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2 font-mono">
                        <span className="font-serif text-sm font-normal text-[#16241C]">
                          {formatCurrency(item.amount, homeCurrency)}
                        </span>
                        <span className="text-[10px] text-[#16241C]/60 min-w-[34px] text-right">
                          {item.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: 7-Day Spending Velocity Timeline */}
        {activeTab === "timeline" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-[#16241C]/70">
              <span>Daily spending velocity across recent entries</span>
              <span className="font-serif text-sm text-[#16241C]">
                Period Total: {formatCurrency(totalSpend, homeCurrency)}
              </span>
            </div>

            {/* Bar Chart Container */}
            <div className="h-44 flex items-end justify-between gap-2 sm:gap-3 pt-6 pb-2 px-1 border-b border-[#16241C]/20">
              {timelineData.list.map((day) => {
                const heightPercent =
                  timelineData.maxVal > 0
                    ? Math.max(8, (day.amount / timelineData.maxVal) * 100)
                    : 8;
                const hasSpend = day.amount > 0;

                return (
                  <div
                    key={day.dateStr}
                    className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end"
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[#16241C] text-white font-mono text-[9px] py-1 px-2 whitespace-nowrap z-10">
                      <p className="font-semibold">{day.label}</p>
                      <p>{formatCurrency(day.amount, homeCurrency)} ({day.count} items)</p>
                    </div>

                    {/* Bar Pill */}
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[36px] transition-all duration-300 ${
                        hasSpend
                          ? "bg-[#16241C] hover:bg-[#2E7D52]"
                          : "bg-[#16241C]/10 border border-dashed border-[#16241C]/20"
                      }`}
                    />

                    {/* Date label */}
                    <span className="font-mono text-[9px] text-[#16241C]/70 truncate w-full text-center uppercase">
                      {day.label.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between font-mono text-[10px] text-[#16241C]/60">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#16241C]" />
                <span>Spend days</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#16241C]/10 border border-dashed border-[#16241C]/20" />
                <span>Zero-spend days</span>
              </span>
            </div>
          </div>
        )}

        {/* Tab 3: Mindset & AI Assessment Flags */}
        {activeTab === "mindset" && (
          <div className="space-y-4 font-mono text-xs">
            <div className="text-[#16241C]/70 leading-relaxed">
              Gemini Companion categorizes reflections by emotional relationship and capital health.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* On Track */}
              <div className="p-3.5 border border-[#2E7D52]/40 bg-[#E5F3EB]/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2E7D52]" />
                    <span className="uppercase tracking-wider font-semibold text-[#2E7D52]">
                      On Track
                    </span>
                  </div>
                  <span className="font-serif text-base text-[#2E7D52]">
                    {flagDistribution.on_track.count} ({flagDistribution.on_track.pct.toFixed(0)}%)
                  </span>
                </div>
                <p className="font-sans text-[11px] text-[#16241C]/80 mt-1.5 leading-snug">
                  Intentional, scheduled, or balanced expenditures adhering to financial goals.
                </p>
              </div>

              {/* Savings Opportunity */}
              <div className="p-3.5 border border-[#16241C]/30 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-[#16241C]" />
                    <span className="uppercase tracking-wider font-semibold text-[#16241C]">
                      Savings Potential
                    </span>
                  </div>
                  <span className="font-serif text-base text-[#16241C]">
                    {flagDistribution.savings_opportunity.count} ({flagDistribution.savings_opportunity.pct.toFixed(0)}%)
                  </span>
                </div>
                <p className="font-sans text-[11px] text-[#16241C]/80 mt-1.5 leading-snug">
                  Subscriptions, bulk purchases, or recurring lines where capital could be retained.
                </p>
              </div>

              {/* Overspend Risk */}
              <div className="p-3.5 border border-rose-300 bg-rose-50/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-700" />
                    <span className="uppercase tracking-wider font-semibold text-rose-700">
                      Overspend Risk
                    </span>
                  </div>
                  <span className="font-serif text-base text-rose-700">
                    {flagDistribution.overspend_risk.count} ({flagDistribution.overspend_risk.pct.toFixed(0)}%)
                  </span>
                </div>
                <p className="font-sans text-[11px] text-[#16241C]/80 mt-1.5 leading-snug">
                  Impulsive splurges or large costs requiring gentle reflection and pacing.
                </p>
              </div>

              {/* Informational / Reflections */}
              <div className="p-3.5 border border-[#16241C]/20 bg-[#F8F7F4]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#16241C]/70" />
                    <span className="uppercase tracking-wider font-semibold text-[#16241C]/80">
                      Reflections
                    </span>
                  </div>
                  <span className="font-serif text-base text-[#16241C]">
                    {flagDistribution.informational.count} ({flagDistribution.informational.pct.toFixed(0)}%)
                  </span>
                </div>
                <p className="font-sans text-[11px] text-[#16241C]/80 mt-1.5 leading-snug">
                  Philosophical questions, long-term plans, and general financial inquiries.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Budget Limits & Utilization */}
        {activeTab === "budget_utilization" && (
          <div className="space-y-3.5 font-mono text-xs">
            <div className="flex items-center justify-between text-[#16241C]/70">
              <span>Recurring Budget Limits vs Recorded Spend</span>
              <span className="text-[10px] uppercase">
                {budgets.length} active {budgets.length === 1 ? "budget" : "budgets"}
              </span>
            </div>

            {budgetUtilization.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#16241C]/60">
                No recurring budgets configured yet. Add one in the Recurring Budgets section.
              </div>
            ) : (
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {budgetUtilization.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 border border-[#16241C]/20 bg-white space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#16241C]">{b.label}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 border border-[#16241C]/30 text-[#16241C]">
                          {b.frequency}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-serif text-sm font-normal text-[#16241C]">
                          {formatCurrency(b.actualSpent, homeCurrency)}
                        </span>
                        <span className="text-[#16241C]/60 text-[10px]">
                          {" "}
                          / {formatCurrency(b.amount, b.currency)}
                        </span>
                      </div>
                    </div>

                    {/* Progress track */}
                    <div className="w-full h-1.5 overflow-hidden bg-[#16241C]/10">
                      <div
                        className={`h-full transition-all duration-500 ${
                          b.isOver
                            ? "bg-rose-600"
                            : b.ratio > 80
                            ? "bg-amber-600"
                            : "bg-[#2E7D52]"
                        }`}
                        style={{ width: `${Math.min(100, b.ratio)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Ranked Category Bars */}
        {activeTab === "bars" && (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1 font-mono text-xs">
            {categoryData.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#16241C]/60">
                No expenses recorded yet.
              </div>
            ) : (
              categoryData.map((item) => {
                return (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#16241C]">
                          {item.category}
                        </span>
                        <span className="text-[10px] text-[#16241C]/60">
                          ({item.count} {item.count === 1 ? "entry" : "entries"})
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-serif text-sm font-normal text-[#16241C]">
                          {formatCurrency(item.amount, homeCurrency)}
                        </span>
                        <span className="text-[10px] min-w-[38px] text-right text-[#16241C]/60">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 overflow-hidden bg-[#16241C]/10">
                      <div
                        className="h-full bg-[#16241C] transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(3, item.percentage))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
