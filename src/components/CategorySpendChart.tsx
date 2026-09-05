import React from "react";
import { PieChart } from "lucide-react";
import { JournalEntry } from "../types";
import { formatCurrency } from "../lib/currencies";

interface CategorySpendChartProps {
  entries: JournalEntry[];
  homeCurrency: string;
}

const CATEGORY_COLORS: Record<string, { bar: string; text: string }> = {
  "Food & Dining": { bar: "bg-[#D97736]", text: "text-[#D97736]" },
  "Housing & Rent": { bar: "bg-[#2A6F97]", text: "text-[#2A6F97]" },
  "Transportation": { bar: "bg-[#C48E28]", text: "text-[#C48E28]" },
  "Utilities & Bills": { bar: "bg-[#3D8D7A]", text: "text-[#3D8D7A]" },
  "Entertainment & Subscriptions": { bar: "bg-[#7A5C96]", text: "text-[#7A5C96]" },
  "Shopping & Personal": { bar: "bg-[#BF5B75]", text: "text-[#BF5B75]" },
  "Healthcare & Fitness": { bar: "bg-[#2D8B57]", text: "text-[#2D8B57]" },
  "Savings & Investments": { bar: "bg-[#257180]", text: "text-[#257180]" },
  "Education & Professional": { bar: "bg-[#486382]", text: "text-[#486382]" },
  "Travel & Leisure": { bar: "bg-[#3F7C85]", text: "text-[#3F7C85]" },
  "Financial Reflection": { bar: "bg-[#5D7A68]", text: "text-[#5D7A68]" },
  "Miscellaneous": { bar: "bg-[#6E8276]", text: "text-[#6E8276]" },
};

export const CategorySpendChart: React.FC<CategorySpendChartProps> = ({
  entries,
  homeCurrency,
}) => {
  // Aggregate expenses by category
  const expenseEntries = entries.filter(
    (e) => e.analysis.entry_type === "expense" && e.analysis.converted_amount > 0
  );

  const categoryTotals: Record<string, { amount: number; count: number }> = {};
  let totalSpend = 0;

  expenseEntries.forEach((entry) => {
    const cat = entry.analysis.category || "Miscellaneous";
    const amt = entry.analysis.converted_amount || 0;
    if (!categoryTotals[cat]) {
      categoryTotals[cat] = { amount: 0, count: 0 };
    }
    categoryTotals[cat].amount += amt;
    categoryTotals[cat].count += 1;
    totalSpend += amt;
  });

  const sortedCategories = Object.entries(categoryTotals)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalSpend > 0 ? (data.amount / totalSpend) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="border border-[#16241C] bg-white p-5 sm:p-6 flex flex-col justify-between shadow-xs">
      <div>
        <div className="flex items-center justify-between mb-4 border-b border-[#16241C]/15 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#16241C] text-white flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-normal text-[#16241C]">
                Spend by Category
              </h3>
              <p className="font-mono text-[10px] text-[#16241C]/60 uppercase tracking-wider">
                Aggregated in {homeCurrency}
              </p>
            </div>
          </div>

          <span className="font-mono text-xs uppercase tracking-wider px-2.5 py-1 bg-white text-[#16241C] border border-[#16241C]">
            Total: {formatCurrency(totalSpend, homeCurrency)}
          </span>
        </div>

        {sortedCategories.length === 0 ? (
          <div className="text-center py-10 font-mono text-xs text-[#16241C]/60 uppercase tracking-wider">
            No expenses recorded yet. Write your first journal entry above!
          </div>
        ) : (
          <div className="space-y-3.5">
            {sortedCategories.map((item) => {
              const color =
                CATEGORY_COLORS[item.category] || {
                  bar: "bg-[#2E7D52]",
                  text: "text-[#2E7D52]",
                };

              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs uppercase tracking-wider font-semibold text-[#16241C]">
                        {item.category}
                      </span>
                      <span className="font-mono text-[10px] text-[#16241C]/60">
                        ({item.count} {item.count === 1 ? "entry" : "entries"})
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 font-mono">
                      <span className="font-serif text-sm font-normal text-[#16241C]">
                        {formatCurrency(item.amount, homeCurrency)}
                      </span>
                      <span className="text-[10px] min-w-[38px] text-right text-[#16241C]/60">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress track */}
                  <div className="w-full h-1.5 overflow-hidden bg-[#16241C]/10">
                    <div
                      className={`h-full ${color.bar} transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(3, item.percentage))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
