import React from "react";
import {
  CreditCard,
  AlertTriangle,
  Sparkles,
  Layers
} from "lucide-react";
import { JournalEntry, RecurringBudget } from "../types";
import { formatCurrency } from "../lib/currencies";

interface DashboardStatsProps {
  entries: JournalEntry[];
  budgets: RecurringBudget[];
  homeCurrency: string;
  streakDays?: number;
  onOpenBreathingModal?: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  entries,
  budgets,
  homeCurrency,
  streakDays = 1,
  onOpenBreathingModal,
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthName = now.toLocaleString("default", { month: "short" });

  // Filter entries for current month
  const currentMonthExpenses = entries.filter((entry) => {
    if (entry.analysis.entry_type !== "expense") return false;
    const entryDate = new Date(entry.timestamp || entry.createdAt);
    return (
      entryDate.getFullYear() === currentYear &&
      entryDate.getMonth() === currentMonth
    );
  });

  const totalSpendThisMonth = currentMonthExpenses.reduce(
    (sum, entry) => sum + (entry.analysis.converted_amount || 0),
    0
  );

  const overspendCount = entries.filter(
    (e) => e.analysis.flag === "overspend_risk"
  ).length;

  const totalRecurringMonthly = budgets.reduce((sum, b) => {
    if (b.frequency === "daily") return sum + b.amount * 30;
    if (b.frequency === "weekly") return sum + b.amount * 4.33;
    if (b.frequency === "yearly") return sum + b.amount / 12;
    return sum + b.amount;
  }, 0);

  return (
    <div className="h-full flex flex-col bg-white border border-[#8FA899]">
      {/* Editorial Header */}
      <div className="bg-[#EDF3EF] border-b border-[#8FA899] px-3.5 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-tech text-xs uppercase tracking-wider font-bold text-[#13241A]">
            [03] MONTHLY OVERVIEW
          </span>
          <span className="w-1.5 h-1.5 bg-[#2D6A4F] inline-block"></span>
        </div>
        <span className="font-tech text-[10px] uppercase tracking-widest text-[#526E5D] font-bold">
          PERIOD: {monthName.toUpperCase()} {currentYear} &bull; ACTIVE
        </span>
      </div>

      {/* Rigid 2x2 Data-Dense Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#8FA899] flex-1">
        {/* Metric 01: Monthly Outflow */}
        <div id="stat-month-spend" className="p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-tech text-[10px] uppercase tracking-wider text-[#526E5D] font-bold">
              [02.1] MONTHLY OUTFLOW
            </span>
            <span className="font-mono text-[9px] text-[#526E5D]">
              {currentMonthExpenses.length} ENTRIES
            </span>
          </div>
          <div className="font-tech text-2xl sm:text-3xl font-bold text-[#13241A] tracking-tight leading-none my-1">
            {formatCurrency(totalSpendThisMonth, homeCurrency)}
          </div>
          <span className="font-mono text-[10px] text-[#526E5D] uppercase tracking-wider">
            Normalized Base Parity
          </span>
        </div>

        {/* Metric 02: Risk Factors */}
        <div id="stat-overspend-flags" className="p-4 flex flex-col justify-between space-y-2 border-t sm:border-t-0 border-[#8FA899]">
          <div className="flex items-center justify-between">
            <span className="font-tech text-[10px] uppercase tracking-wider text-[#526E5D] font-bold">
              [02.2] RISK FACTORS
            </span>
            <span className={`font-tech text-[9px] font-bold uppercase px-1.5 py-0.5 border ${
              overspendCount === 0 
                ? "bg-[#EDF3EF] text-[#2D6A4F] border-[#8FA899]" 
                : "bg-rose-50 text-rose-800 border-rose-300"
            }`}>
              {overspendCount === 0 ? "SECURE" : "FLAGGED"}
            </span>
          </div>
          <div
            className={`font-tech text-2xl sm:text-3xl font-bold tracking-tight leading-none my-1 ${
              overspendCount === 0 ? "text-[#2D6A4F]" : "text-rose-700"
            }`}
          >
            {overspendCount < 10 ? `0${overspendCount}` : overspendCount}
          </div>
          <span className="font-mono text-[10px] text-[#526E5D] uppercase tracking-wider">
            {overspendCount === 0 ? "Zero Anomaly Flags" : `${overspendCount} Overspend Alert(s)`}
          </span>
        </div>
      </div>

      {/* Lower Row 2x2 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#8FA899] border-t border-[#8FA899]">
        {/* Metric 03: Recurring Commitments */}
        <div id="stat-recurring-committed" className="p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-tech text-[10px] uppercase tracking-wider text-[#526E5D] font-bold">
              [02.3] RECURRING COMMITTED
            </span>
            <span className="font-mono text-[9px] text-[#526E5D]">
              {budgets.length} LINES
            </span>
          </div>
          <div className="font-tech text-xl sm:text-2xl font-bold text-[#13241A] tracking-tight leading-none my-1">
            {formatCurrency(totalRecurringMonthly, homeCurrency)}
          </div>
          <span className="font-mono text-[10px] text-[#526E5D] uppercase tracking-wider">
            Monthly Scheduled Burn
          </span>
        </div>

        {/* Metric 04: Discipline Streak */}
        <div id="stat-mindset-streak" className="p-4 flex flex-col justify-between space-y-2 border-t sm:border-t-0 border-[#8FA899]">
          <div className="flex items-center justify-between">
            <span className="font-tech text-[10px] uppercase tracking-wider text-[#526E5D] font-bold">
              [02.4] DISCIPLINE STREAK
            </span>
            {onOpenBreathingModal && (
              <button
                type="button"
                onClick={onOpenBreathingModal}
                className="font-tech text-[9px] uppercase tracking-wider text-[#2D6A4F] hover:text-[#13241A] font-bold underline cursor-pointer"
              >
                [BREATH 4-4-4-4]
              </button>
            )}
          </div>
          <div className="font-tech text-xl sm:text-2xl font-bold text-[#13241A] tracking-tight leading-none my-1">
            {streakDays < 10 ? `0${streakDays}` : streakDays} Consecutive Day{streakDays === 1 ? "" : "s"}
          </div>
          <span className="font-mono text-[10px] text-[#2D6A4F] uppercase tracking-wider font-semibold">
            Active Reflective Practice
          </span>
        </div>
      </div>
    </div>
  );
};
