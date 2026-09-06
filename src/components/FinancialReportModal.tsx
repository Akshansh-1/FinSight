import React, { useState } from "react";
import {
  X,
  FileText,
  Sparkles,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Award
} from "lucide-react";
import { FinancialReport, JournalEntry, RecurringBudget } from "../types";

interface FinancialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  budgets: RecurringBudget[];
  homeCurrency: string;
}

export const FinancialReportModal: React.FC<FinancialReportModalProps> = ({
  isOpen,
  onClose,
  entries,
  budgets,
  homeCurrency,
}) => {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-financial-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries,
          budgets,
          homeCurrency,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate digest");
      }
      setReport(data.report);
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportJson = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      homeCurrency,
      journalEntries: entries,
      activeBudgets: budgets,
      latestDigest: report,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finsight_financial_vault_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    let md = `# FinSight Financial & Mindfulness Journal Export\n`;
    md += `**Date:** ${new Date().toLocaleDateString()}\n`;
    md += `**Home Currency:** ${homeCurrency}\n`;
    md += `**Total Journal Entries:** ${entries.length}\n`;
    md += `**Active Budgets:** ${budgets.length}\n\n`;

    if (report) {
      md += `## AI Mindfulness & Health Digest\n`;
      md += `**Mindfulness Score:** ${report.mindfulnessScore}/100\n`;
      md += `**Needs vs Wants:** ${report.needsVsWantsRatio}\n\n`;
      md += `### Executive Summary\n${report.executiveSummary}\n\n`;

      md += `### Discipline Highlights\n`;
      report.disciplineHighlights.forEach((h) => (md += `- ${h}\n`));
      md += `\n### Areas to Watch (Vulnerabilities)\n`;
      report.vulnerabilities.forEach((v) => (md += `- ${v}\n`));
      md += `\n### 14-Day Action Plan\n`;
      report.actionPlan.forEach((a, i) => (md += `${i + 1}. ${a}\n`));
      md += `\n---\n\n`;
    }

    md += `## Journal Logs\n\n`;
    entries.forEach((e) => {
      md += `### ${new Date(e.timestamp).toLocaleDateString()} - ${e.analysis?.category || "General"}\n`;
      md += `* **Amount:** ${e.analysis?.amount || 0} ${e.analysis?.currency || homeCurrency} (Converted: ${e.analysis?.converted_amount || 0} ${homeCurrency})\n`;
      md += `* **Entry:** ${e.text}\n`;
      md += `* **Reflection Advice:** ${e.analysis?.advice || "N/A"}\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finsight_journal_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#13241A]/60">
      <div className="bg-white border border-[#8FA899] max-w-2xl w-full max-h-[88vh] overflow-hidden flex flex-col">
        {/* Systematic Modal Header */}
        <div className="p-3.5 bg-[#EDF3EF] border-b border-[#8FA899] text-[#13241A] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white flex items-center justify-center border border-[#8FA899]">
              <Sparkles className="w-4 h-4 text-[#2D6A4F]" />
            </div>
            <div>
              <h2 className="font-tech text-xs uppercase tracking-wider font-bold text-[#13241A]">
                [SYS-DOC] AI MINDFULNESS & HEALTH DIGEST
              </h2>
              <p className="font-mono text-[10px] text-[#526E5D]">
                Synthesized by Gemini across {entries.length} records & budgets ({homeCurrency})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#526E5D] hover:text-[#13241A] cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-[#F8F9F5]">
          {!report && !loading && (
            <div className="text-center py-10 px-4 space-y-4">
              <div className="w-12 h-12 border border-[#8FA899] bg-white text-[#13241A] flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6 text-[#2D6A4F]" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="font-tech text-base font-bold uppercase tracking-wider text-[#13241A]">
                  GENERATE SYSTEMATIC HEALTH REPORT
                </h3>
                <p className="text-xs text-[#526E5D] leading-relaxed font-sans">
                  Gemini audits your {entries.length} journal logs, calculates your mindfulness score, categorizes needs vs wants, and formulates a 14-day action plan.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-300 font-mono text-xs text-rose-800 text-left max-w-md mx-auto">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerateReport}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#13241A] hover:bg-[#2D6A4F] text-white font-tech text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#8FA899]" />
                <span>SYNTHESIZE FINANCIAL DIGEST</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="py-16 text-center space-y-3 font-mono">
              <div className="w-6 h-6 border-2 border-[#8FA899] border-t-[#13241A] animate-spin mx-auto" />
              <p className="font-tech text-sm font-bold uppercase tracking-wider text-[#13241A]">
                SYNTHESIZING MULTI-MODEL FINANCIAL REFLECTION...
              </p>
              <p className="text-[10px] text-[#526E5D] uppercase tracking-wider font-mono">
                Auditing expense ratios, discipline patterns, and budget compliance
              </p>
            </div>
          )}

          {report && !loading && (
            <div className="space-y-4">
              {/* Score & Quick Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-[#13241A] text-white flex flex-col justify-between border border-[#13241A]">
                  <div className="flex items-center justify-between font-tech text-[10px] uppercase tracking-wider text-white/75 font-bold">
                    <span>MINDFULNESS SCORE</span>
                    <Award className="w-3.5 h-3.5 text-[#8FA899]" />
                  </div>
                  <div className="my-2">
                    <span className="font-tech text-3xl font-bold text-white">
                      {report.mindfulnessScore}
                    </span>
                    <span className="font-mono text-xs text-white/60 ml-1">/ 100</span>
                  </div>
                  <span className="font-tech text-[9px] uppercase tracking-wider text-[#8FA899] font-bold">
                    {report.mindfulnessScore >= 80 ? "HIGH DISCIPLINE" : "GROWING AWARENESS"}
                  </span>
                </div>

                <div className="p-3.5 bg-white border border-[#8FA899] flex flex-col justify-between">
                  <span className="font-tech text-[10px] uppercase tracking-wider text-[#526E5D] font-bold">Needs vs Wants</span>
                  <p className="font-tech text-lg font-bold text-[#13241A] my-1">
                    {report.needsVsWantsRatio}
                  </p>
                  <span className="font-mono text-[10px] text-[#526E5D]">
                    Top: {report.topCategory}
                  </span>
                </div>

                <div className="p-3.5 bg-white border border-[#8FA899] flex flex-col justify-between">
                  <span className="font-tech text-[10px] uppercase tracking-wider text-[#526E5D] font-bold">Net Cashflow</span>
                  <p className={`font-tech text-lg font-bold my-1 ${report.netSavingsConverted >= 0 ? "text-[#2D6A4F]" : "text-rose-700"}`}>
                    {report.netSavingsConverted >= 0 ? "+" : ""}
                    {report.netSavingsConverted.toFixed(2)} {homeCurrency}
                  </p>
                  <span className="font-mono text-[10px] text-[#526E5D]">
                    Spent: {report.totalExpensesConverted.toFixed(2)} {homeCurrency}
                  </span>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="p-4 bg-white border border-[#8FA899]">
                <h4 className="font-tech text-[10px] uppercase tracking-widest font-bold text-[#13241A] mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  EXECUTIVE SUMMARY
                </h4>
                <p className="text-xs text-[#13241A] leading-relaxed font-sans">
                  {report.executiveSummary}
                </p>
              </div>

              {/* Highlights & Vulnerabilities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-white border border-[#8FA899] space-y-2">
                  <h4 className="font-tech text-[10px] uppercase tracking-wider font-bold text-[#2D6A4F] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6A4F]" />
                    DISCIPLINE HIGHLIGHTS
                  </h4>
                  <ul className="space-y-1.5">
                    {report.disciplineHighlights.map((h, i) => (
                      <li key={i} className="text-xs text-[#13241A] flex items-start gap-1.5 font-sans">
                        <span className="w-1.5 h-1.5 bg-[#2D6A4F] shrink-0 mt-1.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-white border border-rose-300 space-y-2">
                  <h4 className="font-tech text-[10px] uppercase tracking-wider font-bold text-rose-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    AREAS TO GUARD (LEAKS)
                  </h4>
                  <ul className="space-y-1.5">
                    {report.vulnerabilities.map((v, i) => (
                      <li key={i} className="text-xs text-[#13241A] flex items-start gap-1.5 font-sans">
                        <span className="w-1.5 h-1.5 bg-rose-600 shrink-0 mt-1.5" />
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 14-Day Action Plan */}
              <div className="p-4 bg-white border border-[#8FA899] space-y-2.5">
                <h4 className="font-tech text-[10px] uppercase tracking-widest font-bold text-[#13241A] flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-[#2D6A4F]" />
                  14-DAY MINDFUL ACTION PLAN
                </h4>
                <div className="space-y-2">
                  {report.actionPlan.map((action, i) => (
                    <div key={i} className="p-2.5 border border-[#8FA899] bg-[#F8F9F5] flex items-start gap-2.5 text-xs text-[#13241A]">
                      <span className="w-4 h-4 bg-[#13241A] text-white flex items-center justify-center font-mono text-[9px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="font-sans">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Export Controls */}
        <div className="p-3 bg-white border-t border-[#8FA899] flex flex-wrap items-center justify-between gap-3 font-tech text-xs font-bold">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#8FA899] hover:border-[#2D6A4F] text-[#13241A] uppercase tracking-wider cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span>EXPORT (JSON)</span>
            </button>
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#8FA899] hover:border-[#2D6A4F] text-[#13241A] uppercase tracking-wider cursor-pointer"
            >
              <FileText className="w-3 h-3" />
              <span>EXPORT (MD)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {report && (
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={loading}
                className="px-3 py-1.5 border border-[#8FA899] hover:border-[#2D6A4F] text-[#13241A] uppercase tracking-wider cursor-pointer"
              >
                REGENERATE
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-[#13241A] hover:bg-[#2D6A4F] text-white uppercase tracking-wider font-bold cursor-pointer"
            >
              DONE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
