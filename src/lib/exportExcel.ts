import * as XLSX from "xlsx";
import { JournalEntry, RecurringBudget } from "../types";

export interface ExportOptions {
  entries: JournalEntry[];
  budgets?: RecurringBudget[];
  homeCurrency: string;
  scopeLabel?: string;
}

/**
 * Export journal entries and recurring budget commitments to a formatted Excel (.xlsx) file
 */
export function exportToExcel({
  entries,
  budgets = [],
  homeCurrency,
  scopeLabel = "All_Entries",
}: ExportOptions): { success: boolean; filename?: string; error?: string } {
  try {
    const workbook = XLSX.utils.book_new();

    // 1. Transactions Sheet
    const transactionRows = entries.map((entry, index) => {
      const dateObj = new Date(entry.timestamp || entry.createdAt);
      return {
        Index: index + 1,
        Timestamp: dateObj.toISOString(),
        "Date (Formatted)": dateObj.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        "Narrative / Reflection": entry.text,
        "Entry Type": (entry.analysis.entry_type || "expense").toUpperCase(),
        Category: entry.analysis.category || "Uncategorized",
        "Original Amount": Number(entry.analysis.amount) || 0,
        "Original Currency": entry.analysis.currency || homeCurrency,
        "FX Rate Applied": Number(entry.analysis.fx_rate_used) || 1,
        [`Converted Amount (${homeCurrency})`]:
          Number(entry.analysis.converted_amount) || 0,
        "Assessment Flag": entry.analysis.flag || "informational",
        "Recurring Commitment": entry.analysis.is_recurring ? "YES" : "NO",
        "Gemini Advisory Note": entry.analysis.advice || "",
        "Document ID": entry.id,
      };
    });

    const txSheet = XLSX.utils.json_to_sheet(transactionRows);

    // Auto-fit column widths
    const txColWidths = [
      { wch: 8 },  // Index
      { wch: 22 }, // Timestamp
      { wch: 20 }, // Date
      { wch: 45 }, // Narrative
      { wch: 12 }, // Type
      { wch: 20 }, // Category
      { wch: 16 }, // Amount
      { wch: 18 }, // Currency
      { wch: 16 }, // FX Rate
      { wch: 24 }, // Converted
      { wch: 20 }, // Flag
      { wch: 22 }, // Recurring
      { wch: 50 }, // Advice
      { wch: 30 }, // ID
    ];
    txSheet["!cols"] = txColWidths;

    XLSX.utils.book_append_sheet(workbook, txSheet, "Audit Ledger");

    // 2. Summary & Budgets Sheet
    const totalExpenses = entries
      .filter((e) => e.analysis.entry_type === "expense" && e.analysis.amount > 0)
      .reduce((sum, e) => sum + (e.analysis.converted_amount || 0), 0);

    const totalIncome = entries
      .filter((e) => e.analysis.entry_type === "income" && e.analysis.amount > 0)
      .reduce((sum, e) => sum + (e.analysis.converted_amount || 0), 0);

    const summaryRows = [
      { Metric: "Total Ledger Transactions", Value: entries.length, Unit: "records" },
      { Metric: `Total Expenses (${homeCurrency})`, Value: totalExpenses.toFixed(2), Unit: homeCurrency },
      { Metric: `Total Income (${homeCurrency})`, Value: totalIncome.toFixed(2), Unit: homeCurrency },
      { Metric: `Net Flow (${homeCurrency})`, Value: (totalIncome - totalExpenses).toFixed(2), Unit: homeCurrency },
      { Metric: "Active Recurring Budgets", Value: budgets.length, Unit: "rules" },
      { Metric: "Export Generated At", Value: new Date().toISOString(), Unit: "UTC" },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    summarySheet["!cols"] = [{ wch: 30 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Executive Summary");

    // 3. Budgets Sheet if any exist
    if (budgets.length > 0) {
      const budgetRows = budgets.map((b, idx) => ({
        Index: idx + 1,
        Label: b.label,
        Category: b.category || "General",
        Amount: b.amount,
        Currency: b.currency,
        Frequency: b.frequency.toUpperCase(),
        "Created Date": new Date(b.createdAt).toISOString(),
        "Budget ID": b.id,
      }));
      const budgetSheet = XLSX.utils.json_to_sheet(budgetRows);
      budgetSheet["!cols"] = [
        { wch: 8 },
        { wch: 25 },
        { wch: 20 },
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
        { wch: 22 },
        { wch: 28 },
      ];
      XLSX.utils.book_append_sheet(workbook, budgetSheet, "Recurring Budgets");
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `FinSight_${scopeLabel}_${dateStr}.xlsx`;

    // Write file
    XLSX.writeFile(workbook, filename);
    return { success: true, filename };
  } catch (err: any) {
    console.error("Excel export error:", err);
    return {
      success: false,
      error: err?.message || "Failed to generate Excel workbook.",
    };
  }
}
