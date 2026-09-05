import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  BookmarkPlus,
  Compass,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  TrendingDown,
  ArrowRight
} from "lucide-react";
import { ChatMessage, JournalEntry, RecurringBudget } from "../types";

interface FinancialAdvisorChatProps {
  entries: JournalEntry[];
  budgets: RecurringBudget[];
  homeCurrency: string;
  onSaveAdvisorNoteToJournal: (text: string) => Promise<void>;
}

const PROMPT_STARTERS = [
  "Where are my biggest expense leaks based on my logs?",
  "How can I safely trim $100 this month without feeling deprived?",
  "Review my recurring subscriptions for value vs cost",
  "How does my Needs vs Wants balance compare to the 50/30/20 rule?",
];

export const FinancialAdvisorChat: React.FC<FinancialAdvisorChatProps> = ({
  entries,
  budgets,
  homeCurrency,
  onSaveAdvisorNoteToJournal,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      text: `Greetings. I am your Mindful Financial Sage. I have full context of your journal entries and recurring budgets in ${homeCurrency}. How can we bring greater peace, clarity, or intentionality to your wealth today?`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Compute context summaries
  const recentExpenses = entries
    .filter((e) => e.analysis?.entry_type === "expense")
    .reduce((sum, e) => sum + (e.analysis?.converted_amount || 0), 0);

  const categoryCounts: Record<string, number> = {};
  entries.forEach((e) => {
    const cat = e.analysis?.category || "General";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat]) => cat);

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || loading) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      text: messageContent,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/advisor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, text: m.text })),
          homeCurrency,
          contextSummary: {
            totalEntries: entries.length,
            recentExpenses: Number(recentExpenses.toFixed(2)),
            topCategories,
            activeBudgets: budgets.map((b) => ({
              label: b.label,
              amount: b.amount,
              frequency: b.frequency,
            })),
          },
        }),
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Financial Sage could not respond.");
      }

      const modelMsg: ChatMessage = {
        id: `model_${Date.now()}`,
        role: "model",
        text: resData.reply,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error("[Chat Advisor Error]", err);
      setError(err.message || "Failed to get advice. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToJournal = async (msg: ChatMessage) => {
    try {
      setSavedNoteId(msg.id);
      await onSaveAdvisorNoteToJournal(
        `Financial Sage Reflection: "${msg.text.slice(0, 240)}..."`
      );
      setTimeout(() => setSavedNoteId(null), 3000);
    } catch (err) {
      console.warn("Could not save advisor note:", err);
      setSavedNoteId(null);
    }
  };

  return (
    <div className="border border-[#8FA899] bg-white overflow-hidden flex flex-col h-[520px]">
      {/* Systematic Header */}
      <div className="p-3 bg-[#EDF3EF] border-b border-[#8FA899] text-[#13241A] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white flex items-center justify-center border border-[#8FA899]">
            <Sparkles className="w-4 h-4 text-[#2D6A4F]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-tech text-xs uppercase tracking-wider font-bold text-[#13241A]">
                [01-B] SAGE ADVISORY ENGINE
              </span>
              <span className="font-tech text-[9px] uppercase tracking-wider px-1.5 py-0.2 bg-[#2D6A4F]/15 text-[#2D6A4F] border border-[#8FA899] font-bold">
                MULTI-TURN
              </span>
            </div>
            <p className="font-mono text-[10px] text-[#526E5D]">
              Context: {entries.length} records & budgets ({homeCurrency})
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 font-tech text-[10px] text-[#526E5D] bg-white px-2.5 py-1 border border-[#8FA899] font-bold">
          <Compass className="w-3.5 h-3.5 text-[#2D6A4F]" />
          <span>GEMINI RESILIENCE LADDER</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F8F9F5]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`w-7 h-7 flex items-center justify-center shrink-0 mt-0.5 border ${
                msg.role === "user"
                  ? "bg-[#13241A] text-white border-[#13241A]"
                  : "bg-white text-[#13241A] border-[#8FA899]"
              }`}
            >
              {msg.role === "user" ? (
                <UserIcon className="w-3.5 h-3.5" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-[#2D6A4F]" />
              )}
            </div>

            <div
              className={`max-w-[84%] p-3.5 text-xs leading-relaxed border ${
                msg.role === "user"
                  ? "bg-[#13241A] text-white border-[#13241A]"
                  : "bg-white border-[#8FA899] text-[#13241A]"
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{msg.text}</div>

              {msg.role === "model" && msg.id !== "welcome" && (
                <div className="mt-2.5 pt-2 border-t border-[#8FA899]/40 flex items-center justify-between text-[10px] font-mono text-[#526E5D]">
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSaveToJournal(msg)}
                    className="inline-flex items-center gap-1 hover:text-[#13241A] cursor-pointer transition-colors uppercase tracking-wider font-tech font-bold"
                    title="Save this takeaway into your journal interactions"
                  >
                    {savedNoteId === msg.id ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-[#2D6A4F]" />
                        <span className="text-[#2D6A4F]">SAVED TO JOURNAL</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3 h-3 text-[#2D6A4F]" />
                        <span>SAVE INSIGHT</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-white text-[#13241A] border border-[#8FA899] flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-[#2D6A4F]" />
            </div>
            <div className="bg-white border border-[#8FA899] p-3 flex items-center gap-2 font-mono text-xs text-[#13241A]">
              <span className="w-2 h-2 bg-[#2D6A4F] inline-block" />
              <span className="ml-1 text-[11px] font-tech uppercase tracking-wider">
                [SYNTHESIZING FINANCIAL PERSPECTIVES...]
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-300 font-mono text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Starters if conversation is short */}
      {messages.length <= 2 && !loading && (
        <div className="px-4 py-2 bg-[#EDF3EF] border-t border-[#8FA899] flex items-center gap-1.5 overflow-x-auto no-scrollbar font-tech text-[10px]">
          <span className="uppercase font-bold text-[#526E5D] shrink-0">
            PROMPTS:
          </span>
          {PROMPT_STARTERS.map((starter, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(starter)}
              className="px-2.5 py-1 bg-white border border-[#8FA899] hover:border-[#2D6A4F] hover:bg-[#F8F9F5] text-[#13241A] font-medium transition-colors whitespace-nowrap cursor-pointer shrink-0"
            >
              {starter}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-white border-t border-[#8FA899] flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask the Financial Sage anything about your budget or habits (${homeCurrency})...`}
          disabled={loading}
          className="flex-1 px-3 py-2 border border-[#8FA899] bg-[#F8F9F5] text-xs font-mono text-[#13241A] placeholder-[#526E5D]/60 focus:outline-none focus:border-[#2D6A4F] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 py-2 bg-[#13241A] hover:bg-[#2D6A4F] text-white font-tech text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span>TRANSMIT</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
