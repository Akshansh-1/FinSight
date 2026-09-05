import React, { useState, useMemo } from "react";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Info,
  Trash2,
  Edit2,
  Download,
  Filter,
  X,
  RotateCcw,
  FileSpreadsheet,
} from "lucide-react";
import { JournalEntry, AssessmentFlag, RecurringBudget, EntryType } from "../types";
import { formatCurrency } from "../lib/currencies";
import { exportToExcel } from "../lib/exportExcel";

interface HistoryListProps {
  entries: JournalEntry[];
  budgets?: RecurringBudget[];
  homeCurrency: string;
  onDeleteEntry: (entryId: string) => Promise<void>;
  onEditEntry?: (entry: JournalEntry) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  entries,
  budgets = [],
  homeCurrency,
  onDeleteEntry,
  onEditEntry,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFlag, setSelectedFlag] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("all");
  const [selectedRecurringFilter, setSelectedRecurringFilter] = useState<string>("all");
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // Extract all categories present
  const categories = useMemo(() => {
    return Array.from(
      new Set(entries.map((e) => e.analysis.category).filter(Boolean))
    );
  }, [entries]);

  // Check if any search or filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(searchQuery.trim()) ||
      selectedFlag !== "all" ||
      selectedCategory !== "all" ||
      selectedType !== "all" ||
      selectedDateFilter !== "all" ||
      selectedRecurringFilter !== "all" ||
      Boolean(minAmount.trim()) ||
      Boolean(maxAmount.trim())
    );
  }, [
    searchQuery,
    selectedFlag,
    selectedCategory,
    selectedType,
    selectedDateFilter,
    selectedRecurringFilter,
    minAmount,
    maxAmount,
  ]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedFlag("all");
    setSelectedCategory("all");
    setSelectedType("all");
    setSelectedDateFilter("all");
    setSelectedRecurringFilter("all");
    setMinAmount("");
    setMaxAmount("");
  };

  // Filtered entries calculation
  const filteredEntries = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const minVal = minAmount.trim() ? parseFloat(minAmount) : null;
    const maxVal = maxAmount.trim() ? parseFloat(maxAmount) : null;

    return entries.filter((entry) => {
      // 1. Assessment Flag
      if (selectedFlag !== "all" && entry.analysis.flag !== selectedFlag) {
        return false;
      }

      // 2. Category
      if (
        selectedCategory !== "all" &&
        entry.analysis.category !== selectedCategory
      ) {
        return false;
      }

      // 3. Entry Type
      if (selectedType !== "all") {
        const type = entry.analysis.entry_type || "expense";
        if (type !== selectedType) return false;
      }

      // 4. Recurring Filter
      if (selectedRecurringFilter === "recurring_only" && !entry.analysis.is_recurring) {
        return false;
      }
      if (selectedRecurringFilter === "one_time" && entry.analysis.is_recurring) {
        return false;
      }

      // 5. Date Filter
      const entryTime = entry.createdAt || new Date(entry.timestamp).getTime();
      if (selectedDateFilter === "today") {
        if (now - entryTime > oneDayMs) return false;
      } else if (selectedDateFilter === "7days") {
        if (now - entryTime > 7 * oneDayMs) return false;
      } else if (selectedDateFilter === "30days") {
        if (now - entryTime > 30 * oneDayMs) return false;
      }

      // 6. Amount Range
      const amountInHome = Number(entry.analysis.converted_amount) || Number(entry.analysis.amount) || 0;
      if (minVal !== null && !isNaN(minVal) && amountInHome < minVal) {
        return false;
      }
      if (maxVal !== null && !isNaN(maxVal) && amountInHome > maxVal) {
        return false;
      }

      // 7. Text Search Query (searches text, category, advice, currency, and amount)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchText = (entry.text || "").toLowerCase().includes(q);
        const matchCat = (entry.analysis.category || "").toLowerCase().includes(q);
        const matchAdvice = (entry.analysis.advice || "").toLowerCase().includes(q);
        const matchCurrency = (entry.analysis.currency || "").toLowerCase().includes(q);
        const matchAmount = String(entry.analysis.amount || "").includes(q);
        const matchConverted = String(entry.analysis.converted_amount || "").includes(q);

        if (
          !matchText &&
          !matchCat &&
          !matchAdvice &&
          !matchCurrency &&
          !matchAmount &&
          !matchConverted
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    entries,
    selectedFlag,
    selectedCategory,
    selectedType,
    selectedRecurringFilter,
    selectedDateFilter,
    minAmount,
    maxAmount,
    searchQuery,
  ]);

  // Aggregate sum of filtered entries
  const filteredTotalAmount = useMemo(() => {
    return filteredEntries.reduce(
      (sum, e) => sum + (e.analysis.converted_amount || e.analysis.amount || 0),
      0
    );
  }, [filteredEntries]);

  // Handle Export to Excel
  const handleExport = (exportOnlyFiltered = false) => {
    const listToExport = exportOnlyFiltered ? filteredEntries : entries;
    const scopeLabel = exportOnlyFiltered && hasActiveFilters ? "Filtered_Ledger" : "Full_Ledger";

    const result = exportToExcel({
      entries: listToExport,
      budgets,
      homeCurrency,
      scopeLabel,
    });

    if (result.success) {
      setExportFeedback(`Exported ${listToExport.length} entries to ${result.filename}`);
      setTimeout(() => setExportFeedback(null), 4000);
    } else {
      setExportFeedback(result.error || "Export failed.");
      setTimeout(() => setExportFeedback(null), 5000);
    }
  };

  const handleExecuteDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteEntry(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const getFlagBadge = (flag: AssessmentFlag) => {
    switch (flag) {
      case "overspend_risk":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 font-tech text-[9px] uppercase tracking-wider font-bold bg-rose-50 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
            Overspend Risk
          </span>
        );
      case "on_track":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 font-tech text-[9px] uppercase tracking-wider font-bold bg-[#EDF3EF] text-[#2D6A4F] border border-[#8FA899]">
            <CheckCircle2 className="w-2.5 h-2.5 text-[#2D6A4F]" />
            On Track
          </span>
        );
      case "savings_opportunity":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 font-tech text-[9px] uppercase tracking-wider font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <TrendingDown className="w-2.5 h-2.5 text-emerald-600" />
            Savings Opportunity
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 font-tech text-[9px] uppercase tracking-wider font-bold bg-[#EDF3EF] text-[#13241A] border border-[#8FA899]">
            <Info className="w-2.5 h-2.5 text-[#526E5D]" />
            Informational
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-[#8FA899]">
      {/* Systematic Header with Export & Filter Counts */}
      <div className="bg-[#EDF3EF] border-b border-[#8FA899] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-tech text-xs uppercase tracking-wider font-bold text-[#13241A]">
            [06] TRANSACTION HISTORY
          </span>
          <span className="w-1.5 h-1.5 bg-[#2D6A4F] inline-block"></span>
          <span className="font-tech text-[10px] uppercase tracking-wider text-[#526E5D] font-bold">
            {filteredEntries.length} OF {entries.length} RECORDS
          </span>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {exportFeedback && (
            <span className="font-tech text-[10px] uppercase font-bold text-[#2D6A4F] bg-white px-2 py-0.5 border border-[#8FA899]">
              [OK] {exportFeedback}
            </span>
          )}

          <button
            type="button"
            id="export-excel-btn"
            onClick={() => handleExport(hasActiveFilters)}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1 font-tech text-xs uppercase tracking-wider font-bold bg-white hover:bg-[#F8F9F5] text-[#13241A] border border-[#8FA899] transition-colors cursor-pointer disabled:opacity-50"
            title="Export transactions and summary to an Excel (.xlsx) spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#2D6A4F]" />
            <span>
              {hasActiveFilters
                ? `EXPORT FILTERED (${filteredEntries.length}) TO EXCEL`
                : "EXPORT TO EXCEL"}
            </span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        {/* Primary Search & Quick Filter Toolbar */}
        <div className="space-y-2.5 p-3 border border-[#8FA899] bg-[#F8F9F5]">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#526E5D]" />
              <input
                id="history-search-input"
                type="text"
                placeholder="Search text, category, advice, currency, or amount..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 font-mono text-xs border border-[#8FA899] bg-white text-[#13241A] placeholder:text-[#526E5D]/60 focus:outline-none focus:border-[#2D6A4F]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#526E5D] hover:text-[#13241A] cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Flag Selector */}
            <select
              id="history-flag-filter"
              value={selectedFlag}
              onChange={(e) => setSelectedFlag(e.target.value)}
              className="px-2.5 py-1.5 font-mono text-xs border border-[#8FA899] bg-white text-[#13241A] cursor-pointer focus:outline-none focus:border-[#2D6A4F]"
            >
              <option value="all">All Flags</option>
              <option value="overspend_risk">Overspend Risk</option>
              <option value="on_track">On Track</option>
              <option value="savings_opportunity">Savings Opportunity</option>
              <option value="informational">Informational</option>
            </select>

            {/* Quick Category Selector */}
            {categories.length > 0 && (
              <select
                id="history-category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 font-mono text-xs border border-[#8FA899] bg-white text-[#13241A] cursor-pointer focus:outline-none focus:border-[#2D6A4F]"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            {/* Advanced Filters Toggle */}
            <button
              type="button"
              id="toggle-advanced-filters-btn"
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 font-tech text-xs uppercase font-bold border border-[#8FA899] transition-colors cursor-pointer ${
                showAdvancedSearch || hasActiveFilters
                  ? "bg-[#13241A] text-white"
                  : "bg-white text-[#13241A] hover:bg-[#EDF3EF]"
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>FILTERS {hasActiveFilters && "• ACTIVE"}</span>
            </button>

            {/* Reset All Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                id="reset-history-filters-btn"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2 py-1.5 font-tech text-xs uppercase font-bold bg-white text-rose-700 hover:bg-rose-50 border border-rose-300 transition-colors cursor-pointer"
                title="Reset all search queries and filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>RESET</span>
              </button>
            )}
          </div>

          {/* Advanced Multi-Option Filters Panel */}
          {showAdvancedSearch && (
            <div className="pt-2 border-t border-[#8FA899]/40 grid grid-cols-1 sm:grid-cols-4 gap-2.5 font-tech text-[10px] uppercase font-bold">
              {/* Filter: Entry Type */}
              <div className="space-y-1">
                <label className="text-[#526E5D] block">Type</label>
                <select
                  id="filter-entry-type"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-2 py-1 font-mono text-xs border border-[#8FA899] bg-white text-[#13241A] cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="reflection">Reflection</option>
                  <option value="question">Question</option>
                </select>
              </div>

              {/* Filter: Date Horizon */}
              <div className="space-y-1">
                <label className="text-[#526E5D] block">Date Horizon</label>
                <select
                  id="filter-date-horizon"
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="w-full px-2 py-1 font-mono text-xs border border-[#8FA899] bg-white text-[#13241A] cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today (24h)</option>
                  <option value="7days">Past 7 Days</option>
                  <option value="30days">Past 30 Days</option>
                </select>
              </div>

              {/* Filter: Recurring */}
              <div className="space-y-1">
                <label className="text-[#526E5D] block">Commitment</label>
                <select
                  id="filter-recurring"
                  value={selectedRecurringFilter}
                  onChange={(e) => setSelectedRecurringFilter(e.target.value)}
                  className="w-full px-2 py-1 font-mono text-xs border border-[#8FA899] bg-white text-[#13241A] cursor-pointer"
                >
                  <option value="all">All Entries</option>
                  <option value="recurring_only">Recurring Only</option>
                  <option value="one_time">One-Time Only</option>
                </select>
              </div>

              {/* Filter: Converted Amount Bounds */}
              <div className="space-y-1">
                <label className="text-[#526E5D] block">
                  Amount Range ({homeCurrency})
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="filter-min-amount"
                    type="number"
                    placeholder="Min"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    className="w-full px-2 py-1 font-mono text-xs border border-[#8FA899] bg-white text-[#13241A] focus:outline-none focus:border-[#2D6A4F]"
                  />
                  <span className="text-[#526E5D] font-mono">-</span>
                  <input
                    id="filter-max-amount"
                    type="number"
                    placeholder="Max"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="w-full px-2 py-1 font-mono text-xs border border-[#8FA899] bg-white text-[#13241A] focus:outline-none focus:border-[#2D6A4F]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active Filters Summary Strip */}
          {hasActiveFilters && (
            <div className="pt-1.5 flex items-center justify-between flex-wrap gap-2 text-[10px] font-mono text-[#526E5D]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-tech font-bold uppercase text-[#13241A]">
                  ACTIVE CRITERIA:
                </span>
                {searchQuery && (
                  <span className="bg-white border border-[#8FA899] px-1.5 py-0.5">
                    Query: &ldquo;{searchQuery}&rdquo;
                  </span>
                )}
                {selectedFlag !== "all" && (
                  <span className="bg-white border border-[#8FA899] px-1.5 py-0.5">
                    Flag: {selectedFlag}
                  </span>
                )}
                {selectedCategory !== "all" && (
                  <span className="bg-white border border-[#8FA899] px-1.5 py-0.5">
                    Category: {selectedCategory}
                  </span>
                )}
                {selectedType !== "all" && (
                  <span className="bg-white border border-[#8FA899] px-1.5 py-0.5">
                    Type: {selectedType}
                  </span>
                )}
                {selectedDateFilter !== "all" && (
                  <span className="bg-white border border-[#8FA899] px-1.5 py-0.5">
                    Date: {selectedDateFilter}
                  </span>
                )}
                {selectedRecurringFilter !== "all" && (
                  <span className="bg-white border border-[#8FA899] px-1.5 py-0.5">
                    {selectedRecurringFilter}
                  </span>
                )}
                {(minAmount || maxAmount) && (
                  <span className="bg-white border border-[#8FA899] px-1.5 py-0.5">
                    Amount: {minAmount || "0"} - {maxAmount || "∞"} {homeCurrency}
                  </span>
                )}
              </div>

              <div className="font-tech font-bold text-[#13241A]">
                SUBTOTAL: {formatCurrency(filteredTotalAmount, homeCurrency)}
              </div>
            </div>
          )}
        </div>

        {/* Entries List */}
        {filteredEntries.length === 0 ? (
          <div className="text-center py-12 border border-[#8FA899] p-6 bg-[#F8F9F5] font-mono text-xs text-[#526E5D] space-y-2">
            <p>
              {entries.length === 0
                ? "No journal entries recorded yet. Begin by writing an entry above."
                : "No entries match your search or filter selection."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-1 bg-white hover:bg-[#EDF3EF] border border-[#8FA899] text-[#13241A] font-tech text-xs uppercase font-bold cursor-pointer"
              >
                Reset Search Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#8FA899]/40 border border-[#8FA899]">
            {filteredEntries.map((entry) => {
              const dateObj = new Date(entry.timestamp || entry.createdAt);
              const formattedDate = dateObj
                .toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })
                .replace(",", " /");

              const hasForeignCurrency =
                entry.analysis.currency &&
                entry.analysis.currency !== homeCurrency &&
                entry.analysis.amount > 0;

              return (
                <div
                  key={entry.id}
                  id={`entry-card-${entry.id}`}
                  className="p-4 bg-white hover:bg-[#F8F9F5] transition-colors space-y-2"
                >
                  {/* Header row: date & badges vs amount & action buttons */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#526E5D]">
                          {formattedDate}
                        </span>
                        <span className="font-tech text-[9px] uppercase px-1.5 py-0.5 border border-[#8FA899] bg-[#EDF3EF] text-[#13241A] font-bold">
                          {entry.analysis.category}
                        </span>
                        {entry.analysis.entry_type && (
                          <span className="font-tech text-[9px] uppercase px-1.5 py-0.5 border border-[#8FA899] bg-white text-[#526E5D] font-bold">
                            {entry.analysis.entry_type}
                          </span>
                        )}
                        {entry.analysis.is_recurring && (
                          <span className="font-tech text-[9px] uppercase px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                            RECURRING
                          </span>
                        )}
                        {getFlagBadge(entry.analysis.flag)}
                      </div>

                      <h3 className="font-sans text-base sm:text-lg font-semibold text-[#13241A] mt-1 leading-snug">
                        &ldquo;{entry.text}&rdquo;
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      {entry.analysis.amount > 0 ? (
                        <div>
                          <div className="font-tech text-xl sm:text-2xl font-bold text-[#13241A] leading-none">
                            {formatCurrency(
                              entry.analysis.converted_amount,
                              homeCurrency
                            )}
                          </div>
                          {hasForeignCurrency && (
                            <span className="font-mono text-[10px] text-[#526E5D] block mt-0.5">
                              {entry.analysis.currency}{" "}
                              {entry.analysis.amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-sans italic text-sm text-[#526E5D]">
                          Reflection
                        </span>
                      )}

                      {/* Action Controls: Edit & Delete */}
                      <div className="mt-2 flex items-center justify-end gap-1">
                        {/* Edit Button */}
                        {onEditEntry && (
                          <button
                            type="button"
                            id={`edit-entry-btn-${entry.id}`}
                            onClick={() => onEditEntry(entry)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 font-tech text-[9px] uppercase tracking-wider font-bold text-[#13241A] bg-white hover:bg-[#EDF3EF] border border-[#8FA899] transition-colors cursor-pointer"
                            title="Edit entry details and re-analyze"
                          >
                            <Edit2 className="w-2.5 h-2.5 text-[#2D6A4F]" />
                            <span>[EDIT]</span>
                          </button>
                        )}

                        {/* Delete entry confirmation */}
                        {confirmDeleteId === entry.id ? (
                          <div className="flex items-center gap-1 font-tech text-[9px]">
                            <button
                              id={`confirm-delete-entry-${entry.id}`}
                              onClick={() => handleExecuteDelete(entry.id)}
                              disabled={deletingId === entry.id}
                              className="px-2 py-0.5 bg-rose-700 text-white font-bold cursor-pointer"
                            >
                              {deletingId === entry.id ? "..." : "[DELETE]"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="p-1 text-[#526E5D] hover:text-[#13241A] cursor-pointer"
                              aria-label="Cancel delete"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`delete-entry-${entry.id}`}
                            onClick={() => setConfirmDeleteId(entry.id)}
                            className="p-1 text-[#526E5D]/60 hover:text-rose-700 transition-colors cursor-pointer"
                            title="Delete entry"
                            aria-label="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Gemini Insight Quote Line */}
                  {entry.analysis.advice && (
                    <div className="border-l-2 border-[#2D6A4F] pl-3 py-1 text-xs text-[#13241A] font-sans leading-relaxed bg-[#EDF3EF]/60 p-2">
                      <span className="font-tech text-[9px] uppercase tracking-widest text-[#2D6A4F] font-bold block mb-0.5">
                        [SYS] GEMINI ADVISORY NOTE
                      </span>
                      <p className="italic">&ldquo;{entry.analysis.advice}&rdquo;</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
