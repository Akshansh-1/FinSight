export type AssessmentFlag = 'overspend_risk' | 'on_track' | 'savings_opportunity' | 'informational';

export type EntryType = 'expense' | 'income' | 'reflection' | 'question';

export type BudgetFrequency = 'weekly' | 'monthly';

export interface SuggestedBudget {
  label: string;
  amount: number;
  currency: string;
  frequency: BudgetFrequency;
}

export interface FinancialAnalysis {
  category: string;
  amount: number;
  currency: string;
  converted_amount: number;
  home_currency: string;
  fx_rate_used: number;
  flag: AssessmentFlag;
  advice: string;
  is_recurring: boolean;
  entry_type: EntryType;
  intentTag?: string;
  suggested_budget?: SuggestedBudget | null;
  description?: string;
  item_text?: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  text: string;
  originalPrompt?: string;
  timestamp: string; // ISO string
  createdAt: number; // epoch ms
  analysis: FinancialAnalysis;
  intentTag?: string;
}

export interface RecurringBudget {
  id: string;
  userId: string;
  label: string;
  amount: number;
  currency: string;
  converted_amount?: number;
  frequency: BudgetFrequency;
  category?: string;
  createdAt: number;
  sourceEntryId?: string;
}

export interface UserPreferences {
  homeCurrency: string;
  updatedAt?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface FinancialReport {
  generatedAt: number;
  periodLabel: string;
  totalExpensesConverted: number;
  totalIncomeConverted: number;
  netSavingsConverted: number;
  currency: string;
  needsVsWantsRatio: string;
  topCategory: string;
  mindfulnessScore: number; // 0 - 100
  executiveSummary: string;
  disciplineHighlights: string[];
  vulnerabilities: string[];
  actionPlan: string[];
}
