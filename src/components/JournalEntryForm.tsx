import React, { useState } from "react";
import {
  Sparkles,
  Send,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Info,
  CalendarCheck,
  PlusCircle,
  HelpCircle,
  Mic,
  PenTool,
  Check
} from "lucide-react";
import { FinancialAnalysis, SuggestedBudget } from "../types";
import { formatCurrency } from "../lib/currencies";
import { AudioJournalRecorder } from "./AudioJournalRecorder";

interface JournalEntryFormProps {
  homeCurrency: string;
  existingBudgets: Array<{ label: string; amount: number; frequency: string }>;
  onAnalyzeAndSave: (
    text: string
  ) => Promise<{ success: boolean; analysis?: FinancialAnalysis; error?: string; entryId?: string }>;
  onConfirmSuggestedBudget: (budget: SuggestedBudget, sourceEntryId?: string) => Promise<void>;
}

const QUICK_PROMPTS = [
  "Paid €48.50 for dinner at an Italian bistro with coworkers",
  "Subscribed to Netflix 4K for $22.99/mo, is this eating into my savings?",
  "Paid ₹12,500 for monthly gym membership and personal trainer",
  "Spent ¥14,500 on bullet train Shinkansen ticket to Kyoto",
  "Paid $1,850 for monthly apartment rent and maintenance fee",
  "Reflecting on cutting food delivery by 30% to build an emergency fund"
];

const REFLECTION_INSPIRATIONS = [
  "What is one expense that brought you genuine joy or value recently?",
  "Did you pause before an impulse buy today? Reflect on that feeling of restraint.",
  "Which subscription or recurring bill could you let go of with zero regret?",
  "How will today's financial discipline give you freedom and peace of mind in 6 months?",
  "What is something small you spent on someone else that made you feel connected?",
  "Are you spending to relieve temporary stress or to invest in lasting fulfillment?"
];

const INTENT_TAGS = [
  { id: "need", label: "Essential Need", icon: "🌱", color: "hover:border-emerald-300 hover:bg-emerald-50/60 text-emerald-900" },
  { id: "joy", label: "Daily Comfort", icon: "☕", color: "hover:border-amber-300 hover:bg-amber-50/60 text-amber-900" },
  { id: "gift", label: "Gift & Sharing", icon: "🎁", color: "hover:border-purple-300 hover:bg-purple-50/60 text-purple-900" },
  { id: "impulse", label: "Urge / Impulse", icon: "⚡", color: "hover:border-rose-300 hover:bg-rose-50/60 text-rose-900" },
  { id: "growth", label: "Future Growth", icon: "📈", color: "hover:border-blue-300 hover:bg-blue-50/60 text-blue-900" },
  { id: "peace", label: "Peace of Mind", icon: "🕊️", color: "hover:border-teal-300 hover:bg-teal-50/60 text-teal-900" },
];

export const JournalEntryForm: React.FC<JournalEntryFormProps> = ({
  homeCurrency,
  onAnalyzeAndSave,
  onConfirmSuggestedBudget,
}) => {
  const [entryText, setEntryText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [inspirationIndex, setInspirationIndex] = useState(0);
  const [showInspirations, setShowInspirations] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [transcribedNotice, setTranscribedNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successCelebration, setSuccessCelebration] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<FinancialAnalysis | null>(null);
  const [lastEntryId, setLastEntryId] = useState<string | undefined>(undefined);
  const [suggestedBudgetPending, setSuggestedBudgetPending] = useState<SuggestedBudget | null>(null);
  const [budgetAddedSuccess, setBudgetAddedSuccess] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);

  const handleNextInspiration = () => {
    setInspirationIndex((prev) => (prev + 1) % REFLECTION_INSPIRATIONS.length);
  };

  const handleApplyInspiration = (prompt: string) => {
    setEntryText((prev) => {
      const clean = prev.trim();
      return clean ? `${clean}\n\nReflection: ${prompt}` : `Reflection: ${prompt} `;
    });
  };

  const handleToggleIntent = (tag: typeof INTENT_TAGS[0]) => {
    if (selectedIntent === tag.id) {
      setSelectedIntent(null);
    } else {
      setSelectedIntent(tag.id);
      // If user hasn't typed anything yet, or wants a gentle prefix
      setEntryText((prev) => {
        const prefix = `[${tag.label}] `;
        if (prev.startsWith("[")) {
          // Replace existing tag prefix
          return prev.replace(/^\[[^\]]+\]\s*/, prefix);
        }
        return prev ? `${prefix}${prev}` : prefix;
      });
    }
  };

  const handleTranscription = (text: string, autoSubmit: boolean = false) => {
    setEntryText(text);
    setTranscribedNotice("Transcribed from audio note! Review or adjust your thoughts, then record.");
    if (autoSubmit) {
      setTimeout(() => {
        handleSubmit();
      }, 300);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!entryText.trim() || loading) return;

    setLoading(true);
    setErrorMessage(null);
    setLastAnalysis(null);
    setLastEntryId(undefined);
    setSuggestedBudgetPending(null);
    setBudgetAddedSuccess(false);

    const result = await onAnalyzeAndSave(entryText);

    if (result.success && result.analysis) {
      setLastAnalysis(result.analysis);
      setLastEntryId(result.entryId);
      if (result.analysis.suggested_budget) {
        setSuggestedBudgetPending(result.analysis.suggested_budget);
      }
      // Clear input only upon confirmed successful save
      setEntryText("");
      setTranscribedNotice(null);
      setSelectedIntent(null);
      setSuccessCelebration(true);
      setTimeout(() => setSuccessCelebration(false), 5000);
    } else {
      setErrorMessage(result.error || "Could not analyze or save entry. Please try again.");
    }

    setLoading(false);
  };

  const handleConfirmBudget = async () => {
    if (!suggestedBudgetPending || savingBudget) return;
    setSavingBudget(true);
    try {
      await onConfirmSuggestedBudget(suggestedBudgetPending, lastEntryId);
      setBudgetAddedSuccess(true);
      setSuggestedBudgetPending(null);
    } catch (err: any) {
      setErrorMessage("Failed to add recurring budget: " + (err.message || "Unknown error"));
    } finally {
      setSavingBudget(false);
    }
  };

  const getFlagBadge = (flag: string) => {
    switch (flag) {
      case "overspend_risk":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider font-semibold bg-rose-50 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3 h-3" />
            Overspend Risk
          </span>
        );
      case "on_track":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider font-semibold bg-[#EAF5EE] text-[#1E5638] border border-[#2E7D52]">
            <CheckCircle2 className="w-3 h-3" />
            On Track
          </span>
        );
      case "savings_opportunity":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider font-semibold bg-indigo-50 text-indigo-800 border border-indigo-300">
            <TrendingDown className="w-3 h-3" />
            Savings Opportunity
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 font-tech text-[10px] uppercase tracking-wider font-bold bg-[#EDF3EF] text-[#13241A] border border-[#8FA899]">
            <Info className="w-3 h-3 text-[#2D6A4F]" />
            Informational
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-[#8FA899]">
      {/* Editorial Header */}
      <div className="bg-[#EDF3EF] border-b border-[#8FA899] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-tech text-xs uppercase tracking-wider font-bold text-[#13241A]">
            [01] NEW JOURNAL ENTRY
          </span>
          <span className="w-1.5 h-1.5 bg-[#2D6A4F] inline-block"></span>
        </div>
        <span className="font-tech text-[10px] uppercase tracking-widest text-[#526E5D] font-bold">
          {loading ? "PROCESSING TELEMETRY..." : "GEMINI ENGINE &bull; READY"}
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Audio Journal Suite (Collapsible) */}
        {showAudioRecorder && (
          <div className="border border-[#8FA899] bg-[#F8F9F5] p-3.5">
            <AudioJournalRecorder
              onTranscriptionComplete={handleTranscription}
              disabled={loading}
            />
          </div>
        )}

        {/* Transcribed Notification Banner */}
        {transcribedNotice && (
          <div className="p-3 bg-[#EDF3EF] border border-[#8FA899] font-mono text-xs text-[#13241A] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#2D6A4F] shrink-0" />
              <span>{transcribedNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setTranscribedNotice(null)}
              className="font-tech text-[10px] uppercase tracking-wider text-[#2D6A4F] font-bold underline cursor-pointer"
            >
              [DISMISS]
            </button>
          </div>
        )}

        {/* Success Celebration Banner */}
        {successCelebration && (
          <div className="p-3 bg-[#EDF3EF] border border-[#2D6A4F] font-mono text-xs text-[#13241A] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2D6A4F] shrink-0" />
              <span className="font-tech font-bold uppercase tracking-wide text-[#2D6A4F]">
                [CONFIRMED] Reflection Persisted to Ledger &bull; Clarity Synchronized
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessCelebration(false)}
              className="font-tech text-[10px] uppercase tracking-wider text-[#2D6A4F] font-bold underline cursor-pointer"
            >
              [CLOSE]
            </button>
          </div>
        )}

        {/* Systematic Journal Input Box */}
        <div className="border border-[#8FA899] p-4 sm:p-5 bg-white space-y-3">
          <div className="flex items-center justify-between border-b border-[#8FA899]/30 pb-2">
            <span className="font-tech text-[10px] uppercase tracking-widest text-[#526E5D] font-bold">
              [TELEMETRY BUFFER] VOICE MEMO & FINANCIAL MEMO
            </span>
            {selectedIntent && (
              <span className="font-tech text-[10px] uppercase tracking-wider text-[#2D6A4F] font-bold">
                TAG: {selectedIntent}
              </span>
            )}
          </div>

          <textarea
            id="journal-entry-input"
            value={entryText}
            onChange={(e) => setEntryText(e.target.value)}
            disabled={loading}
            placeholder="Dictate or type: Paid €48.50 for dinner with team in Berlin, or Subscribed to Bloomberg for $34.99/mo, or set aside $500 for emergency fund..."
            className="w-full border-none outline-none font-sans text-base sm:text-lg leading-relaxed resize-none h-28 text-[#13241A] placeholder:text-[#526E5D]/50 bg-transparent"
          />

          {/* Action Buttons Row */}
          <div className="pt-3 border-t border-[#8FA899]/40 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="submit-journal-entry-btn"
                type="button"
                onClick={() => handleSubmit()}
                disabled={loading || !entryText.trim()}
                className="bg-[#2D6A4F] hover:bg-[#23553F] text-white px-5 py-2 font-tech text-xs uppercase tracking-wider font-bold cursor-pointer disabled:opacity-40 inline-flex items-center gap-2 transition-colors border border-[#2D6A4F]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>[ANALYZING TELEMETRY...]</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>[ANALYZE & RECORD ENTRY]</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowAudioRecorder((prev) => !prev)}
                className="bg-white border border-[#8FA899] text-[#13241A] hover:bg-[#EDF3EF] px-3.5 py-2 font-tech text-xs uppercase tracking-wider font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors"
              >
                <Mic className="w-3.5 h-3.5 text-[#2D6A4F]" />
                <span>{showAudioRecorder ? "[HIDE AUDIO]" : "[VOICE MEMO]"}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowInspirations((prev) => !prev)}
              className="font-tech text-[10px] uppercase tracking-wider text-[#526E5D] hover:text-[#13241A] font-bold underline cursor-pointer"
            >
              {showInspirations ? "[HIDE PROMPTS]" : "[MINDFUL PROMPTS]"}
            </button>
          </div>
        </div>

        {/* Intent Stance Badges */}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="font-tech text-[10px] uppercase tracking-wider text-[#526E5D] font-bold mr-1">
            STANCE:
          </span>
          {INTENT_TAGS.map((tag) => {
            const isSelected = selectedIntent === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleToggleIntent(tag)}
                className={`px-2.5 py-1 font-tech text-[10px] uppercase tracking-wider border cursor-pointer transition-colors inline-flex items-center gap-1.5 font-bold ${
                  isSelected
                    ? "bg-[#13241A] text-white border-[#13241A]"
                    : "bg-white text-[#13241A] border-[#8FA899] hover:bg-[#EDF3EF]"
                }`}
              >
                <span>{tag.icon}</span>
                <span>{tag.label}</span>
              </button>
            );
          })}
          {selectedIntent && (
            <button
              type="button"
              onClick={() => setSelectedIntent(null)}
              className="font-tech text-[9px] uppercase tracking-wider text-[#526E5D] hover:text-[#13241A] underline ml-1 cursor-pointer font-bold"
            >
              [RESET]
            </button>
          )}
        </div>

        {/* Inspirations Drawer */}
        {showInspirations && (
          <div className="p-3 border border-[#8FA899] bg-[#EDF3EF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">💭</span>
              <p className="text-xs text-[#13241A] font-sans italic">
                &ldquo;{REFLECTION_INSPIRATIONS[inspirationIndex]}&rdquo;
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleApplyInspiration(REFLECTION_INSPIRATIONS[inspirationIndex])}
                className="px-2.5 py-1 bg-[#13241A] text-white font-tech text-[10px] uppercase tracking-wider font-bold cursor-pointer"
              >
                [APPLY]
              </button>
              <button
                type="button"
                onClick={handleNextInspiration}
                className="p-1 text-[#526E5D] hover:text-[#13241A] cursor-pointer"
                title="Next prompt"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Quick Prompts */}
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              id={`sample-prompt-${idx}`}
              onClick={() => setEntryText(prompt)}
              className="font-mono text-[10px] px-2 py-1 border border-[#8FA899]/60 hover:border-[#13241A] bg-white text-[#13241A] transition-colors cursor-pointer text-left"
            >
              {prompt.length > 38 ? prompt.substring(0, 38) + "…" : prompt}
            </button>
          ))}
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div
            id="journal-error-banner"
            className="p-3 bg-rose-50 border border-rose-300 flex items-center justify-between text-xs text-rose-900 font-mono"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              id="retry-save-btn"
              onClick={() => handleSubmit()}
              className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white font-tech text-[10px] uppercase tracking-wider font-bold cursor-pointer"
            >
              [RETRY SAVE]
            </button>
          </div>
        )}

        {/* Latest Analysis Result Card */}
        {lastAnalysis && (
          <div
            id="latest-analysis-card"
            className="p-4 sm:p-5 border border-[#8FA899] bg-[#F8F9F5] space-y-3"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#8FA899]/40 pb-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-tech text-xs uppercase tracking-wider font-bold text-[#13241A]">
                    [{lastAnalysis.category.toUpperCase()}]
                  </span>
                  <span className="font-tech text-[9px] uppercase px-1.5 py-0.5 border border-[#8FA899] bg-white text-[#13241A] font-bold">
                    {lastAnalysis.entry_type}
                  </span>
                  {lastAnalysis.is_recurring && (
                    <span className="inline-flex items-center gap-1 font-tech text-[9px] uppercase px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                      <CalendarCheck className="w-3 h-3" />
                      RECURRING SCHEDULED
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  {lastAnalysis.amount > 0 ? (
                    <>
                      <span className="font-tech text-2xl font-bold text-[#13241A]">
                        {formatCurrency(lastAnalysis.converted_amount, homeCurrency)}
                      </span>
                      {lastAnalysis.currency !== homeCurrency && (
                        <span className="font-mono text-[10px] text-[#526E5D]">
                          ({formatCurrency(lastAnalysis.amount, lastAnalysis.currency)} @ 1 {lastAnalysis.currency} = {lastAnalysis.fx_rate_used} {homeCurrency})
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="font-sans text-sm italic text-[#526E5D]">
                      Introspective / Reflection Entry (Zero Direct Outflow)
                    </span>
                  )}
                </div>
              </div>

              <div>{getFlagBadge(lastAnalysis.flag)}</div>
            </div>

            {/* Gemini Direct Reflection Quote */}
            <div className="border-l-2 border-[#2D6A4F] pl-3 py-1 text-xs text-[#13241A] leading-relaxed bg-white p-2.5">
              <span className="font-tech text-[9px] uppercase tracking-wider text-[#2D6A4F] font-bold block mb-1">
                [SYS] GEMINI FINANCIAL ADVISORY
              </span>
              <p className="font-sans italic">{lastAnalysis.advice}</p>
            </div>

            {/* Suggested Recurring Budget */}
            {suggestedBudgetPending && (
              <div
                id="suggested-budget-box"
                className="p-3 border border-amber-300 bg-amber-50 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-tech text-[10px] uppercase tracking-wider font-bold">
                    <CalendarCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>[ACTION REQUIRED] SUGGESTED RECURRING BUDGET LINE</span>
                  </div>
                  <p className="text-xs mt-0.5 font-sans font-semibold">
                    &ldquo;{suggestedBudgetPending.label}&rdquo; &bull;{" "}
                    {formatCurrency(suggestedBudgetPending.amount, suggestedBudgetPending.currency)} /{" "}
                    {suggestedBudgetPending.frequency}
                  </p>
                </div>

                <button
                  id="confirm-budget-btn"
                  onClick={handleConfirmBudget}
                  disabled={savingBudget}
                  className="bg-[#13241A] hover:bg-[#2D6A4F] text-white px-3 py-1.5 font-tech text-[10px] uppercase tracking-wider font-bold cursor-pointer inline-flex items-center gap-1.5"
                >
                  {savingBudget ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <PlusCircle className="w-3 h-3" />
                  )}
                  <span>[CONFIRM BUDGET LINE]</span>
                </button>
              </div>
            )}

            {budgetAddedSuccess && (
              <div className="p-2 border border-[#2D6A4F] bg-[#EDF3EF] font-tech text-xs text-[#2D6A4F] font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F] shrink-0" />
                <span>BUDGET LINE CONFIRMED AND COMMITTED TO LEDGER</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
