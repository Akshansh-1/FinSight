import React, { useState } from "react";
import {
  Layers,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
  RefreshCw,
  Clock
} from "lucide-react";
import { RecurringBudget, JournalEntry, BudgetFrequency } from "../types";
import { formatCurrency, SUPPORTED_CURRENCIES } from "../lib/currencies";

interface BudgetManagerProps {
  budgets: RecurringBudget[];
  entries: JournalEntry[];
  homeCurrency: string;
  onAddBudget: (budget: Omit<RecurringBudget, "id" | "userId" | "createdAt">) => Promise<void>;
  onDeleteBudget: (budgetId: string) => Promise<void>;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({
  budgets,
  entries,
  homeCurrency,
  onAddBudget,
  onDeleteBudget,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(homeCurrency);
  const [frequency, setFrequency] = useState<BudgetFrequency>("monthly");
  const [category, setCategory] = useState("General Expense");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Helper to calculate spend for a budget in its current period
  const calculateSpendForBudget = (budget: RecurringBudget) => {
    const budgetLabelLower = budget.label.toLowerCase();
    const budgetCatLower = (budget.category || "").toLowerCase();

    const matchingEntries = entries.filter((entry) => {
      if (entry.analysis.entry_type !== "expense") return false;
      const entryDate = new Date(entry.timestamp || entry.createdAt);

      if (budget.frequency === "weekly") {
        // Entries within the past 7 days
        const diffMs = now.getTime() - entryDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays > 7 || diffDays < 0) return false;
      } else {
        // Current calendar month
        if (
          entryDate.getFullYear() !== currentYear ||
          entryDate.getMonth() !== currentMonth
        ) {
          return false;
        }
      }

      // Match by label keyword or category
      const textLower = entry.text.toLowerCase();
      const catMatch = entry.analysis.category.toLowerCase();
      const labelWords = budgetLabelLower.split(" ").filter((w) => w.length > 2);

      const matchesLabel = labelWords.some((word) => textLower.includes(word));
      const matchesCategory =
        budgetCatLower &&
        budgetCatLower !== "general expense" &&
        catMatch.includes(budgetCatLower);

      return matchesLabel || matchesCategory;
    });

    return matchingEntries.reduce(
      (sum, e) => sum + (e.analysis.converted_amount || 0),
      0
    );
  };

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!label.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Please provide a valid label and positive budget amount.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await onAddBudget({
        label: label.trim(),
        amount: parsedAmount,
        currency,
        frequency,
        category,
      });
      // Reset form
      setLabel("");
      setAmount("");
      setShowAddModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save budget.");
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteBudget(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white border border-[#8FA899]">
      {/* Editorial Header */}
      <div className="bg-[#EDF3EF] border-b border-[#8FA899] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-tech text-xs uppercase tracking-wider font-bold text-[#13241A]">
            [05] ACTIVE BUDGETS
          </span>
          <span className="w-1.5 h-1.5 bg-[#2D6A4F] inline-block"></span>
        </div>
        <button
          id="open-add-budget-modal-btn"
          onClick={() => {
            setErrorMsg(null);
            setShowAddModal(true);
          }}
          className="font-tech text-[10px] uppercase tracking-wider text-[#2D6A4F] hover:text-[#13241A] font-bold underline cursor-pointer"
        >
          [+ NEW BUDGET CAP]
        </button>
      </div>

      <div className="p-4 sm:p-5">
        {budgets.length === 0 ? (
          <div className="text-center py-10 border border-[#8FA899] p-6 bg-[#F8F9F5] font-mono text-xs text-[#526E5D] space-y-2">
            <p className="font-tech text-base font-bold text-[#13241A] uppercase">
              NO RECURRING BUDGET LINES ESTABLISHED YET
            </p>
            <p className="text-xs max-w-sm mx-auto font-sans">
              Create periodic caps manually, or allow Gemini to flag recurring subscriptions automatically from your journal reflections.
            </p>
            <button
              id="empty-state-add-budget-btn"
              onClick={() => setShowAddModal(true)}
              className="inline-block mt-2 px-3.5 py-2 border border-[#2D6A4F] bg-[#2D6A4F] text-white font-tech text-[10px] uppercase tracking-wider font-bold cursor-pointer hover:bg-[#23553F]"
            >
              [CREATE FIRST BUDGET LINE]
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.map((b) => {
              const currentSpend = calculateSpendForBudget(b);
              const budgetCap = b.amount;
              const percentage = budgetCap > 0 ? (currentSpend / budgetCap) * 100 : 0;
              const isOver = percentage >= 100;
              const isWarning = percentage >= 80 && percentage < 100;

              return (
                <div
                  key={b.id}
                  id={`budget-card-${b.id}`}
                  className="p-4 border border-[#8FA899] bg-[#F8F9F5] flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 border-b border-[#8FA899]/30 pb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-tech text-base font-bold text-[#13241A]">
                            {b.label}
                          </span>
                          <span className="font-tech text-[9px] uppercase px-1.5 py-0.5 border border-[#8FA899] bg-white text-[#13241A] font-bold">
                            {b.frequency}
                          </span>
                        </div>
                        {b.category && (
                          <p className="font-tech text-[9px] text-[#526E5D] uppercase tracking-wider mt-0.5 font-bold">
                            {b.category}
                          </p>
                        )}
                      </div>

                      {confirmDeleteId === b.id ? (
                        <div className="flex items-center gap-1 font-tech text-[9px]">
                          <button
                            id={`confirm-delete-budget-${b.id}`}
                            onClick={() => handleExecuteDelete(b.id)}
                            disabled={deletingId === b.id}
                            className="px-2 py-0.5 bg-rose-700 text-white font-bold cursor-pointer"
                          >
                            {deletingId === b.id ? "..." : "[CONFIRM]"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="p-1 text-[#526E5D] hover:text-[#13241A] cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`delete-budget-${b.id}`}
                          onClick={() => setConfirmDeleteId(b.id)}
                          className="p-1 text-[#526E5D] hover:text-rose-700 transition-colors cursor-pointer"
                          title="Delete budget line"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Spend vs Limit */}
                    <div className="mt-3 flex items-baseline justify-between text-xs font-mono">
                      <span className="text-[#526E5D]">
                        Spend:{" "}
                        <strong className="text-[#13241A]">
                          {formatCurrency(currentSpend, homeCurrency)}
                        </strong>
                      </span>
                      <span className="text-[#13241A] font-bold">
                        Cap: {formatCurrency(b.amount, b.currency)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 w-full h-2 overflow-hidden bg-[#EDF3EF] border border-[#8FA899]/40">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isOver
                            ? "bg-rose-600"
                            : isWarning
                            ? "bg-amber-600"
                            : "bg-[#2D6A4F]"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
                      />
                    </div>
                  </div>

                  {/* Status footnote */}
                  <div className="mt-3 pt-2 border-t border-[#8FA899]/30 flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-1">
                      {isOver ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold uppercase">
                          <AlertCircle className="w-3 h-3" />
                          EXCEEDED ({percentage.toFixed(0)}%)
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center gap-1 text-amber-800 font-bold uppercase">
                          <Clock className="w-3 h-3" />
                          NEAR CAP ({percentage.toFixed(0)}%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#2D6A4F] font-bold uppercase">
                          <CheckCircle2 className="w-3 h-3" />
                          WITHIN LIMIT ({percentage.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                    <span className="text-[#526E5D]">
                      Rem: {formatCurrency(Math.max(0, b.amount - currentSpend), b.currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Budget Creation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#13241A]/50 flex items-center justify-center p-4">
          <div className="max-w-md w-full border border-[#8FA899] bg-white text-[#13241A] space-y-4">
            <div className="bg-[#EDF3EF] border-b border-[#8FA899] px-4 py-2.5 flex items-center justify-between">
              <span className="font-tech text-xs uppercase tracking-wider font-bold text-[#13241A]">
                [05.1] DEFINE RECURRING BUDGET LINE
              </span>
              <button
                id="close-budget-modal-btn"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-[#526E5D] hover:text-[#13241A] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 font-mono text-xs text-rose-800">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateBudget} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block font-tech uppercase tracking-wider text-[10px] mb-1 text-[#13241A] font-bold">
                    BUDGET LABEL
                  </label>
                  <input
                    id="budget-label-input"
                    type="text"
                    required
                    placeholder="e.g. Netflix, Rent, Groceries, Gym"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full p-2 border border-[#8FA899] bg-[#F8F9F5] text-[#13241A] focus:border-[#2D6A4F] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-tech uppercase tracking-wider text-[10px] mb-1 text-[#13241A] font-bold">
                      AMOUNT CAP
                    </label>
                    <input
                      id="budget-amount-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full p-2 border border-[#8FA899] bg-[#F8F9F5] text-[#13241A] focus:border-[#2D6A4F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-tech uppercase tracking-wider text-[10px] mb-1 text-[#13241A] font-bold">
                      CURRENCY
                    </label>
                    <select
                      id="budget-currency-select"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full p-2 border border-[#8FA899] bg-white text-[#13241A] focus:border-[#2D6A4F] focus:outline-none cursor-pointer"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-tech uppercase tracking-wider text-[10px] mb-1 text-[#13241A] font-bold">
                      FREQUENCY
                    </label>
                    <select
                      id="budget-frequency-select"
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as BudgetFrequency)}
                      className="w-full p-2 border border-[#8FA899] bg-white text-[#13241A] focus:border-[#2D6A4F] focus:outline-none cursor-pointer"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-tech uppercase tracking-wider text-[10px] mb-1 text-[#13241A] font-bold">
                      CATEGORY TAG
                    </label>
                    <select
                      id="budget-category-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-2 border border-[#8FA899] bg-white text-[#13241A] focus:border-[#2D6A4F] focus:outline-none cursor-pointer"
                    >
                      <option value="Food & Dining">Food & Dining</option>
                      <option value="Housing & Rent">Housing & Rent</option>
                      <option value="Transportation">Transportation</option>
                      <option value="Utilities & Bills">Utilities & Bills</option>
                      <option value="Entertainment & Subscriptions">Entertainment & Subscriptions</option>
                      <option value="Shopping & Personal">Shopping & Personal</option>
                      <option value="Healthcare & Fitness">Healthcare & Fitness</option>
                      <option value="Savings & Investments">Savings & Investments</option>
                      <option value="General Expense">General Expense</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#8FA899]/30">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-2 text-xs font-tech uppercase tracking-wider text-[#526E5D] hover:text-[#13241A] cursor-pointer font-bold"
                  >
                    [CANCEL]
                  </button>
                  <button
                    id="save-new-budget-btn"
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-[#2D6A4F] hover:bg-[#23553F] text-white font-tech text-xs uppercase tracking-wider font-bold cursor-pointer disabled:opacity-50"
                  >
                    {saving ? "[SAVING...]" : "[SAVE BUDGET LINE]"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
