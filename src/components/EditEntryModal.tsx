import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Edit3,
  DollarSign,
  Tag,
  Calendar,
  Layers,
} from "lucide-react";
import { JournalEntry, EntryType, AssessmentFlag } from "../types";
import { SUPPORTED_CURRENCIES, formatCurrency } from "../lib/currencies";

interface EditEntryModalProps {
  isOpen: boolean;
  entry: JournalEntry | null;
  homeCurrency: string;
  onClose: () => void;
  onSaveEntry: (updatedEntry: JournalEntry) => Promise<{ success: boolean; error?: string }>;
}

export const EditEntryModal: React.FC<EditEntryModalProps> = ({
  isOpen,
  entry,
  homeCurrency,
  onClose,
  onSaveEntry,
}) => {
  if (!isOpen || !entry) return null;

  const [text, setText] = useState(entry.text || "");
  const [entryType, setEntryType] = useState<EntryType>(
    entry.analysis?.entry_type || "expense"
  );
  const [amount, setAmount] = useState<number>(entry.analysis?.amount || 0);
  const [currency, setCurrency] = useState<string>(
    entry.analysis?.currency || homeCurrency
  );
  const [category, setCategory] = useState<string>(
    entry.analysis?.category || "General Expense"
  );
  const [flag, setFlag] = useState<AssessmentFlag>(
    entry.analysis?.flag || "on_track"
  );
  const [isRecurring, setIsRecurring] = useState<boolean>(
    Boolean(entry.analysis?.is_recurring)
  );
  const [advice, setAdvice] = useState<string>(entry.analysis?.advice || "");
  const [convertedAmount, setConvertedAmount] = useState<number>(
    entry.analysis?.converted_amount || 0
  );
  const [fxRateUsed, setFxRateUsed] = useState<number>(
    entry.analysis?.fx_rate_used || 1
  );

  const [saving, setSaving] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [recalculatingFx, setRecalculatingFx] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state whenever selected entry changes
  useEffect(() => {
    if (entry) {
      setText(entry.text || "");
      setEntryType(entry.analysis?.entry_type || "expense");
      setAmount(entry.analysis?.amount || 0);
      setCurrency(entry.analysis?.currency || homeCurrency);
      setCategory(entry.analysis?.category || "General Expense");
      setFlag(entry.analysis?.flag || "on_track");
      setIsRecurring(Boolean(entry.analysis?.is_recurring));
      setAdvice(entry.analysis?.advice || "");
      setConvertedAmount(entry.analysis?.converted_amount || 0);
      setFxRateUsed(entry.analysis?.fx_rate_used || 1);
      setErrorMessage(null);
      setSaveSuccess(false);
    }
  }, [entry, homeCurrency]);

  // Recalculate FX rate when currency or amount changes
  const handleRecalculateFX = async (newAmount?: number, newCurrency?: string) => {
    const amt = newAmount !== undefined ? newAmount : amount;
    const curr = (newCurrency || currency).toUpperCase();
    const home = homeCurrency.toUpperCase();

    if (curr === home) {
      setFxRateUsed(1);
      setConvertedAmount(amt);
      return;
    }

    setRecalculatingFx(true);
    try {
      const res = await fetch(`/api/fx-rates?base=${curr}`);
      if (res.ok) {
        const data = await res.json();
        if (data.rates && data.rates[home]) {
          const rate = data.rates[home];
          setFxRateUsed(rate);
          setConvertedAmount(Number((amt * rate).toFixed(2)));
          return;
        }
      }
      // Fallback
      setConvertedAmount(amt);
    } catch {
      setConvertedAmount(amt);
    } finally {
      setRecalculatingFx(false);
    }
  };

  // Re-Analyze text using Gemini AI endpoint
  const handleReanalyzeWithGemini = async () => {
    if (!text.trim()) {
      setErrorMessage("Please provide narrative text before asking Gemini to re-analyze.");
      return;
    }
    setReanalyzing(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/analyze-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          homeCurrency,
          existingBudgets: [],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const resData = await response.json();
      if (!resData.success || !resData.analysis) {
        throw new Error(resData.error || "Analysis failed.");
      }

      const a = resData.analysis;
      setCategory(a.category || "General Expense");
      setAmount(a.amount || 0);
      setCurrency(a.currency || homeCurrency);
      setConvertedAmount(a.converted_amount || 0);
      setFxRateUsed(a.fx_rate_used || 1);
      setFlag(a.flag || "on_track");
      setAdvice(a.advice || "");
      setIsRecurring(Boolean(a.is_recurring));
      setEntryType(a.entry_type || "expense");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to re-analyze with Gemini.");
    } finally {
      setReanalyzing(false);
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!text.trim()) {
      setErrorMessage("Narrative text cannot be empty.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const updatedEntry: JournalEntry = {
      ...entry,
      text: text.trim(),
      analysis: {
        ...entry.analysis,
        category: category.trim() || "General Expense",
        amount: Number(amount) || 0,
        currency: currency.toUpperCase(),
        converted_amount: Number(convertedAmount) || Number(amount) || 0,
        home_currency: homeCurrency,
        fx_rate_used: Number(fxRateUsed) || 1,
        flag,
        advice: advice.trim(),
        is_recurring: isRecurring,
        entry_type: entryType,
      },
    };

    const result = await onSaveEntry(updatedEntry);
    setSaving(false);

    if (result.success) {
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 500);
    } else {
      setErrorMessage(result.error || "Failed to persist changes. Please retry.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#13241A]/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-2xl w-full border border-[#8FA899] bg-white text-[#13241A] my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#EDF3EF] border-b border-[#8FA899]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white text-[#13241A] flex items-center justify-center border border-[#8FA899]">
              <Edit3 className="w-3.5 h-3.5 text-[#2D6A4F]" />
            </div>
            <div>
              <h3 className="font-tech text-xs uppercase tracking-wider font-bold text-[#13241A]">
                [SYS-EDIT] AUDIT ENTRY MODIFICATION
              </h3>
              <p className="font-mono text-[10px] text-[#526E5D]">
                Document ID: {entry.id}
              </p>
            </div>
          </div>
          <button
            id="close-edit-modal-btn"
            onClick={onClose}
            className="p-1 text-[#526E5D] hover:text-[#13241A] cursor-pointer"
            aria-label="Close edit modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs bg-[#F8F9F5]">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 border border-rose-400 bg-rose-50 text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-mono text-[11px] leading-relaxed">
                <span className="font-bold">[ERROR] </span>
                {errorMessage}
              </div>
              <button
                onClick={() => handleSave()}
                disabled={saving}
                className="px-2 py-0.5 bg-rose-700 text-white font-tech text-[10px] uppercase font-bold cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Success Banner */}
          {saveSuccess && (
            <div className="p-3 border border-[#8FA899] bg-[#EDF3EF] text-[#2D6A4F] flex items-center gap-2 font-tech text-xs font-bold uppercase">
              <CheckCircle2 className="w-4 h-4 text-[#2D6A4F]" />
              <span>[CONFIRMED] ENTRY COMMITTED TO AUDIT LEDGER</span>
            </div>
          )}

          {/* Narrative Text */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="edit-entry-text"
                className="font-tech text-[10px] uppercase tracking-wider font-bold text-[#13241A]"
              >
                NARRATIVE REFLECTION / JOURNAL TEXT
              </label>
              <button
                type="button"
                id="reanalyze-entry-btn"
                onClick={handleReanalyzeWithGemini}
                disabled={reanalyzing || !text.trim()}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 font-tech text-[9px] uppercase font-bold bg-white hover:bg-[#EDF3EF] text-[#2D6A4F] border border-[#8FA899] transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3 h-3 ${reanalyzing ? "animate-spin" : ""}`} />
                <span>{reanalyzing ? "ANALYZING..." : "RE-ANALYZE WITH GEMINI"}</span>
              </button>
            </div>
            <textarea
              id="edit-entry-text"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-2.5 font-sans text-xs border border-[#8FA899] bg-white text-[#13241A] focus:outline-none focus:border-[#2D6A4F]"
              placeholder="E.g., Spent $45 on groceries at Trader Joe's for dinner party..."
            />
          </div>

          {/* Entry Type & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="edit-entry-type"
                className="font-tech text-[10px] uppercase tracking-wider font-bold text-[#13241A]"
              >
                ENTRY TYPE
              </label>
              <select
                id="edit-entry-type"
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as EntryType)}
                className="w-full px-2.5 py-1.5 font-mono text-xs border border-[#8FA899] bg-white text-[#13241A] cursor-pointer focus:outline-none focus:border-[#2D6A4F]"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="reflection">Mindful Reflection</option>
                <option value="question">Question / Curiosity</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="edit-entry-category"
                className="font-tech text-[10px] uppercase tracking-wider font-bold text-[#13241A]"
              >
                CATEGORY
              </label>
              <input
                id="edit-entry-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="category-suggestions"
                className="w-full px-2.5 py-1.5 font-mono text-xs border border-[#8FA899] bg-white text-[#13241A] focus:outline-none focus:border-[#2D6A4F]"
                placeholder="Category name"
              />
              <datalist id="category-suggestions">
                <option value="Dining & Food" />
                <option value="Groceries" />
                <option value="Housing & Rent" />
                <option value="Utilities" />
                <option value="Transportation" />
                <option value="Healthcare & Wellness" />
                <option value="Subscriptions & Tech" />
                <option value="Entertainment" />
                <option value="Travel" />
                <option value="Education" />
                <option value="Income & Salary" />
                <option value="Investments" />
              </datalist>
            </div>
          </div>

          {/* Financial Amounts & Currency */}
          <div className="p-3 border border-[#8FA899] bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-tech text-[10px] uppercase tracking-wider font-bold text-[#13241A] flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-[#2D6A4F]" />
                FINANCIAL VALUATION & FX PARITY
              </span>
              <button
                type="button"
                onClick={() => handleRecalculateFX()}
                disabled={recalculatingFx}
                className="inline-flex items-center gap-1 font-tech text-[9px] uppercase font-bold text-[#526E5D] hover:text-[#13241A] cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${recalculatingFx ? "animate-spin" : ""}`} />
                <span>SYNC FX RATE</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="edit-entry-amount"
                  className="font-mono text-[10px] text-[#526E5D] uppercase"
                >
                  Original Amount
                </label>
                <input
                  id="edit-entry-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => {
                    const newAmt = parseFloat(e.target.value) || 0;
                    setAmount(newAmt);
                    handleRecalculateFX(newAmt, currency);
                  }}
                  className="w-full px-2.5 py-1.5 font-mono text-xs border border-[#8FA899] bg-[#F8F9F5] text-[#13241A] focus:outline-none focus:border-[#2D6A4F]"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="edit-entry-currency"
                  className="font-mono text-[10px] text-[#526E5D] uppercase"
                >
                  Currency
                </label>
                <select
                  id="edit-entry-currency"
                  value={currency}
                  onChange={(e) => {
                    const newCurr = e.target.value;
                    setCurrency(newCurr);
                    handleRecalculateFX(amount, newCurr);
                  }}
                  className="w-full px-2.5 py-1.5 font-mono text-xs border border-[#8FA899] bg-[#F8F9F5] text-[#13241A] cursor-pointer focus:outline-none focus:border-[#2D6A4F]"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="edit-entry-converted"
                  className="font-mono text-[10px] text-[#526E5D] uppercase"
                >
                  Converted ({homeCurrency})
                </label>
                <input
                  id="edit-entry-converted"
                  type="number"
                  step="0.01"
                  min="0"
                  value={convertedAmount}
                  onChange={(e) => setConvertedAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 font-mono text-xs border border-[#8FA899] bg-[#EDF3EF] text-[#13241A] font-bold focus:outline-none focus:border-[#2D6A4F]"
                />
              </div>
            </div>

            {currency !== homeCurrency && (
              <p className="font-mono text-[10px] text-[#526E5D]">
                FX Applied: 1 {currency} = {fxRateUsed.toFixed(4)} {homeCurrency}
              </p>
            )}
          </div>

          {/* Flags & Recurring Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label
                htmlFor="edit-entry-flag"
                className="font-tech text-[10px] uppercase tracking-wider font-bold text-[#13241A]"
              >
                ASSESSMENT FLAG
              </label>
              <select
                id="edit-entry-flag"
                value={flag}
                onChange={(e) => setFlag(e.target.value as AssessmentFlag)}
                className="w-full px-2.5 py-1.5 font-mono text-xs border border-[#8FA899] bg-white text-[#13241A] cursor-pointer focus:outline-none focus:border-[#2D6A4F]"
              >
                <option value="on_track">On Track</option>
                <option value="overspend_risk">Overspend Risk</option>
                <option value="savings_opportunity">Savings Opportunity</option>
                <option value="informational">Informational</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                id="edit-entry-recurring"
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 border border-[#8FA899] text-[#2D6A4F] focus:ring-0 cursor-pointer"
              />
              <label
                htmlFor="edit-entry-recurring"
                className="font-tech text-xs uppercase tracking-wider font-bold text-[#13241A] cursor-pointer select-none"
              >
                Recurring Commitment (Subscription / Bill)
              </label>
            </div>
          </div>

          {/* Gemini Advisory Note */}
          <div className="space-y-1.5">
            <label
              htmlFor="edit-entry-advice"
              className="font-tech text-[10px] uppercase tracking-wider font-bold text-[#13241A]"
            >
              GEMINI ADVISORY NOTE / AUDIT INSIGHT
            </label>
            <textarea
              id="edit-entry-advice"
              rows={2}
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              className="w-full p-2.5 font-mono text-xs border border-[#8FA899] bg-white text-[#13241A] focus:outline-none focus:border-[#2D6A4F]"
              placeholder="Advisory note on mindful spending..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#8FA899] bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 font-tech text-xs uppercase tracking-wider font-bold text-[#526E5D] hover:text-[#13241A] border border-[#8FA899] bg-white hover:bg-[#EDF3EF] transition-colors cursor-pointer"
          >
            DISMISS
          </button>

          <button
            type="button"
            id="save-edit-entry-btn"
            onClick={handleSave}
            disabled={saving || !text.trim()}
            className="inline-flex items-center gap-2 px-5 py-1.5 font-tech text-xs uppercase tracking-wider font-bold bg-[#13241A] hover:bg-[#2D6A4F] text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>SAVING CHANGES...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>SAVE AUDIT MODIFICATION</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
