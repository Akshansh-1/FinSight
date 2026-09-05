import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const PORT = 3000;

// Reusable FX Cache with 1-hour TTL
interface FXCache {
  rates: Record<string, number>;
  timestamp: number;
  base: string;
}

const fxCache: Record<string, FXCache> = {};

// Fallback rates against USD if external network is unavailable
const DEFAULT_USD_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  INR: 86.5,
  CAD: 1.38,
  AUD: 1.54,
  JPY: 152.0,
  CHF: 0.88,
  CNY: 7.24,
  SGD: 1.34,
  AED: 3.67,
  MXN: 20.3,
  BRL: 5.75,
  ZAR: 18.2
};

function normalizeCurrencyCode(currStr: string, homeCurrency: string): string {
  if (!currStr) return homeCurrency;
  const cleaned = currStr.trim().toUpperCase();
  const symbolMap: Record<string, string> = {
    "$": "USD",
    "€": "EUR",
    "£": "GBP",
    "₹": "INR",
    "¥": "JPY",
    "A$": "AUD",
    "C$": "CAD",
    "R$": "BRL",
    "FR.": "CHF",
    "S$": "SGD",
  };
  if (symbolMap[cleaned]) {
    if (cleaned === "$" && ["USD", "CAD", "AUD", "SGD", "NZD", "HKD"].includes(homeCurrency)) {
      return homeCurrency;
    }
    return symbolMap[cleaned];
  }

  const wordMap: Record<string, string> = {
    "RUPEE": "INR",
    "RUPEES": "INR",
    "RS": "INR",
    "INR": "INR",
    "DOLLAR": "USD",
    "DOLLARS": "USD",
    "BUCKS": "USD",
    "USD": "USD",
    "EURO": "EUR",
    "EUROS": "EUR",
    "EUR": "EUR",
    "POUND": "GBP",
    "POUNDS": "GBP",
    "GBP": "GBP",
    "YEN": "JPY",
    "JPY": "JPY",
    "DIRHAM": "AED",
    "DIRHAMS": "AED",
    "AED": "AED",
    "YUAN": "CNY",
    "CNY": "CNY",
    "PESO": "MXN",
    "PESOS": "MXN",
    "MXN": "MXN",
    "REAL": "BRL",
    "REAIS": "BRL",
    "BRL": "BRL",
    "RAND": "ZAR",
    "ZAR": "ZAR",
    "FRANC": "CHF",
    "FRANCS": "CHF",
    "CHF": "CHF",
    "CAD": "CAD",
    "AUD": "AUD",
    "SGD": "SGD",
  };
  if (wordMap[cleaned]) {
    return wordMap[cleaned];
  }

  const lettersOnly = cleaned.replace(/[^A-Z]/g, "");
  if (wordMap[lettersOnly]) {
    return wordMap[lettersOnly];
  }
  if (lettersOnly.length === 3) {
    return lettersOnly;
  }
  return homeCurrency;
}

async function getExchangeRates(baseCurrency: string): Promise<Record<string, number>> {
  const base = (baseCurrency || "USD").toUpperCase();
  const now = Date.now();
  
  if (fxCache[base] && (now - fxCache[base].timestamp < 3600000)) {
    return fxCache[base].rates;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        fxCache[base] = {
          rates: data.rates,
          timestamp: now,
          base
        };
        return data.rates;
      }
    }
  } catch (err) {
    console.warn(`[FX API] Network fetch failed for base ${base}, using calculated fallbacks:`, err);
  }

  // Derive rates from default USD table
  const baseUsdRate = DEFAULT_USD_RATES[base] || 1.0;
  const derivedRates: Record<string, number> = {};
  for (const [curr, usdRate] of Object.entries(DEFAULT_USD_RATES)) {
    derivedRates[curr] = Number((usdRate / baseUsdRate).toFixed(4));
  }
  derivedRates[base] = 1.0;

  fxCache[base] = {
    rates: derivedRates,
    timestamp: now,
    base
  };
  return derivedRates;
}

// Fallback model ladder as mandated by resilience protocol
// Prioritize high-availability and fast response models to seamlessly absorb demand spikes
const MODEL_LADDER = [
  "gemini-3.1-flash-lite", // High-Availability Fallback: ultra-fast, robust under high concurrency
  "gemini-3.7-flash",      // Deep Reasoning Fallback
  "gemini-3.6-flash",      // Primary Flash model
  "gemini-3.8-flash",      // Flash advanced
  "gemini-flash-latest"    // Dynamic alias
];

const AUDIO_MODEL_LADDER = [
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
  "gemini-3.5-transcribe",
  "gemini-3.6-flash",
  "gemini-3.8-flash"
];

// Track temporary model cooldowns when encountering 503/429 spikes
const modelCooldownMap = new Map<string, number>();

function getActiveModelLadder(candidates: string[] = MODEL_LADDER): string[] {
  const now = Date.now();
  const available: string[] = [];
  const coolingDown: string[] = [];

  for (const m of candidates) {
    const cd = modelCooldownMap.get(m);
    if (cd && cd > now) {
      coolingDown.push(m);
    } else {
      available.push(m);
    }
  }

  // Attempt active, non-cooling models first, followed by cooling models as last resort
  return [...available, ...coolingDown];
}

function isRecoverableStatus(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.code || (err.error && (err.error.code || err.error.status));
  if (
    status === 503 ||
    status === 429 ||
    status === 404 ||
    status === 500 ||
    status === "UNAVAILABLE" ||
    status === "RESOURCE_EXHAUSTED" ||
    status === "NOT_FOUND"
  ) {
    return true;
  }
  const str = String(err?.message || err).toLowerCase();
  return (
    str.includes("503") ||
    str.includes("unavailable") ||
    str.includes("429") ||
    str.includes("resource_exhausted") ||
    str.includes("spending cap") ||
    str.includes("high demand") ||
    str.includes("spikes in demand") ||
    str.includes("404") ||
    str.includes("not_found")
  );
}

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in the environment.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function generateContentWithFallback(prompt: string, responseSchema?: any): Promise<string> {
  const ai = getGeminiClient();
  let lastError: any = null;
  const ladder = getActiveModelLadder(MODEL_LADDER);

  for (const modelName of ladder) {
    try {
      const config: any = {
        temperature: 0.2,
      };
      if (responseSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = responseSchema;
      }

      const result = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config,
      });

      if (result && result.text) {
        return result.text;
      }
    } catch (err: any) {
      lastError = err;
      if (isRecoverableStatus(err)) {
        modelCooldownMap.set(modelName, Date.now() + 60000);
        console.log(`[Gemini Resilience Protocol] Model ${modelName} experiencing temporary load/unavailable status; transitioning smoothly to next fallback model.`);
      } else {
        console.log(`[Gemini Fallback] Model ${modelName} stepping to next model in chain.`);
      }
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed. Last error: ${lastError?.message || lastError}`);
}

async function generateContentFromAudioWithFallback(
  audioBase64: string,
  mimeType: string,
  promptText: string
): Promise<string> {
  const ai = getGeminiClient();
  let lastError: any = null;
  const ladder = getActiveModelLadder(AUDIO_MODEL_LADDER);

  for (const modelName of ladder) {
    try {
      const config: any = {
        temperature: 0.1,
      };

      const result = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || "audio/webm",
                  data: audioBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        ],
        config,
      });

      if (result && result.text) {
        return result.text;
      }
    } catch (err: any) {
      lastError = err;
      if (isRecoverableStatus(err)) {
        modelCooldownMap.set(modelName, Date.now() + 60000);
        console.log(`[Gemini Audio Resilience] Model ${modelName} experiencing temporary load; stepping to next fallback in ladder.`);
      } else {
        console.log(`[Gemini Audio Fallback] Model ${modelName} stepping to next model in chain.`);
      }
    }
  }

  throw new Error(`All Gemini models in fallback ladder failed for audio. Last error: ${lastError?.message || lastError}`);
}

async function startServer() {
  const app = express();

  // Top-Level Request Deserialization (Ordering Guarantee)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      models: MODEL_LADDER
    });
  });

  // Free FX rates proxy/cached endpoint
  app.get("/api/fx-rates", async (req, res) => {
    try {
      const base = typeof req.query.base === "string" ? req.query.base.toUpperCase() : "USD";
      const rates = await getExchangeRates(base);
      res.json({ success: true, base, rates });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || "Failed to fetch FX rates" });
    }
  });

  // Audio Transcription Endpoint using Gemini Multimodal Audio
  app.post("/api/transcribe-audio", async (req, res) => {
    const data = (req.body && typeof req.body === "object") ? req.body : {};
    let rawAudio = typeof data.audioBase64 === "string" ? data.audioBase64.trim() : "";
    const mimeType = typeof data.mimeType === "string" && data.mimeType.trim()
      ? data.mimeType.trim().toLowerCase()
      : "audio/webm";

    if (!rawAudio) {
      res.status(400).json({
        success: false,
        error: "Audio payload (base64) is required."
      });
      return;
    }

    // Strip data URI prefix if present e.g. "data:audio/webm;base64,"
    if (rawAudio.includes(",")) {
      rawAudio = rawAudio.split(",")[1];
    }

    try {
      const prompt = `You are an accurate, thoughtful audio transcriber for a financial journal and budget companion.
Listen carefully to this voice recording and transcribe exactly what the speaker says.
Guidelines:
1. Preserve all currency mentions, expense amounts, items purchased, or emotional reflections on money verbatim.
2. Format numbers, currencies, and dates cleanly (e.g., "$45", "€20", "1500 JPY", "March 15th").
3. Do not add conversational filler from yourself or commentary; output ONLY the clear, accurate transcribed text.`;

      const transcribedText = await generateContentFromAudioWithFallback(rawAudio, mimeType, prompt);

      res.json({
        success: true,
        text: transcribedText.trim()
      });
    } catch (err: any) {
      console.error("[Audio Transcription Error]", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to transcribe audio. Please verify your microphone or speak clearly."
      });
    }
  });

// Fallback multi-item parser for resilience if AI model services are unavailable
function fallbackMultiItemParser(text: string, homeCurrency: string, rates: Record<string, number>) {
  const chunks = text.split(/(?<=[a-zA-Z\s])(?=(?:(?:\$|€|£|₹|¥|USD|EUR|GBP|INR|JPY|CAD|AUD|rupees?|bucks?|dollars?)\s*\d+)|\d+\s*(?:\$|€|£|₹|¥|USD|EUR|GBP|INR|JPY|CAD|AUD|rupees?|bucks?|dollars?))/i);
  const extracted: Array<{ amount: number; currency: string; description: string }> = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/(?:(\$|€|£|₹|¥|USD|EUR|GBP|INR|JPY|CAD|AUD|rupees?|bucks?|dollars?)\s*(\d+(?:\.\d+)?))|(\d+(?:\.\d+)?)\s*(\$|€|£|₹|¥|USD|EUR|GBP|INR|JPY|CAD|AUD|rupees?|bucks?|dollars?)?/i);
    if (match) {
      const amtStr = match[2] || match[3];
      const currStr = match[1] || match[4] || homeCurrency;
      const amt = Number(amtStr);
      if (!isNaN(amt) && amt > 0) {
        const desc = trimmed
          .replace(/(?:(\$|€|£|₹|¥|USD|EUR|GBP|INR|JPY|CAD|AUD|rupees?|bucks?|dollars?)\s*(\d+(?:\.\d+)?))|(\d+(?:\.\d+)?)\s*(\$|€|£|₹|¥|USD|EUR|GBP|INR|JPY|CAD|AUD|rupees?|bucks?|dollars?)?/ig, "")
          .replace(/^(spent|paid|bought|on|for|in|\s|,)+/i, "")
          .replace(/(\s|,)+$/i, "")
          .trim();

        extracted.push({
          amount: amt,
          currency: normalizeCurrencyCode(currStr, homeCurrency),
          description: desc || "Expense",
        });
      }
    }
  }

  const items = extracted.length > 0 ? extracted : [{
    amount: 0,
    currency: homeCurrency,
    description: text,
  }];

  return items.map((item, idx) => {
    let category = "General Expense";
    const lowerDesc = item.description.toLowerCase();
    if (lowerDesc.includes("food") || lowerDesc.includes("dinner") || lowerDesc.includes("lunch") || lowerDesc.includes("coffee") || lowerDesc.includes("groceries")) {
      category = "Food & Dining";
    } else if (lowerDesc.includes("game") || lowerDesc.includes("steam") || lowerDesc.includes("movie") || lowerDesc.includes("netflix")) {
      category = "Entertainment & Subscriptions";
    } else if (lowerDesc.includes("travel") || lowerDesc.includes("flight") || lowerDesc.includes("train") || lowerDesc.includes("bus") || lowerDesc.includes("hotel") || lowerDesc.includes("trip")) {
      category = "Travel & Leisure";
    } else if (lowerDesc.includes("rent") || lowerDesc.includes("apartment") || lowerDesc.includes("house")) {
      category = "Housing & Rent";
    } else if (lowerDesc.includes("gym") || lowerDesc.includes("fitness") || lowerDesc.includes("health")) {
      category = "Healthcare & Fitness";
    } else if (lowerDesc.includes("shopping") || lowerDesc.includes("clothes") || lowerDesc.includes("shoes")) {
      category = "Shopping & Personal";
    }

    let fxRateToHome = 1.0;
    if (item.currency !== homeCurrency) {
      const rate = rates[item.currency];
      if (rate && rate > 0) {
        fxRateToHome = 1 / rate;
      } else {
        const entryUsd = DEFAULT_USD_RATES[item.currency] || 1;
        const homeUsd = DEFAULT_USD_RATES[homeCurrency] || 1;
        fxRateToHome = homeUsd / entryUsd;
      }
    }
    const convertedAmount = Number((item.amount * fxRateToHome).toFixed(2));

    return {
      description: item.description || (items.length > 1 ? `Item ${idx + 1}` : text),
      category,
      amount: item.amount,
      currency: item.currency,
      converted_amount: convertedAmount,
      home_currency: homeCurrency,
      fx_rate_used: Number(fxRateToHome.toFixed(4)),
      flag: "on_track" as const,
      advice: "Logged into your financial ledger. Keep an eye on category balance across expenditures.",
      is_recurring: false,
      entry_type: (item.amount > 0 ? "expense" : "reflection") as "expense" | "reflection",
      suggested_budget: null,
    };
  });
}

  // Main Journal Entry Analysis Route with Multi-Item Extraction
  app.post("/api/analyze-entry", async (req, res) => {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const data = (req.body && typeof req.body === "object") ? req.body : {};
    const text = typeof data.text === "string" ? data.text.trim() : "";
    const homeCurrency = typeof data.homeCurrency === "string" && data.homeCurrency.trim() 
      ? data.homeCurrency.trim().toUpperCase() 
      : "USD";
    const existingBudgets = Array.isArray(data.existingBudgets) ? data.existingBudgets : [];

    if (!text) {
      res.status(400).json({
        success: false,
        error: "Journal entry text is required."
      });
      return;
    }

    // Pre-fetch exchange rates for user's home currency
    const rates = await getExchangeRates(homeCurrency);

    try {
      // Build Gemini prompt with explicit instructions for multi-item / multi-expense extraction
      const prompt = `
You are an expert, empathetic financial companion analyzing a user's free-text financial journal entry.
The user's configured home currency is: "${homeCurrency}".
Here are the user's active recurring budgets (for context):
${JSON.stringify(existingBudgets, null, 2)}

User's Journal Entry:
"""
${text}
"""

CRITICAL INSTRUCTION - MULTI-ITEM EXTRACTION:
The user input may mention MULTIPLE expenses, transactions, purchases, or thoughts in a single sentence (for example: "Spent 20$ on games 1000 rupees on food 300 on travel", or "Bought groceries for 50 bucks and paid 30 euros for gas").
You MUST SPLIT multi-item or multi-expense inputs into distinct, separate line items.
If the input only contains a single expense or reflection, return an array with that one transaction object.
Do NOT combine multiple expenses into one. Every individual item/purchase/category must be its own object in the "transactions" array.

For each distinct transaction/item:
1. "description": A concise, clear label for what was spent or thought (e.g., "Games", "Food / Groceries", "Travel", "Coffee").
2. "entry_type": Determine whether this item is "expense" (money spent or committed), "income" (earnings/received), "reflection" (thoughts/questions/plans about finances), or "question".
3. "amount": Extract the specific numeric amount for THIS item (e.g. 20, 1000, 300). Set to 0 if purely reflection/question without a numeric amount.
4. "currency": Extract the currency mentioned for this item (e.g. $, USD, €, EUR, ₹, INR, rupees, £, GBP, ¥, JPY, CAD, AUD, etc.). If a symbol or name is used (e.g. "rupees", "bucks"), standardize to standard 3-letter ISO code or currency code (e.g., INR for rupees, USD for bucks/$). If no currency is explicitly mentioned for a specific item in the sentence, infer from context or default to "${homeCurrency}".
5. "category": Assign the most accurate category from:
   - "Food & Dining"
   - "Housing & Rent"
   - "Transportation"
   - "Utilities & Bills"
   - "Entertainment & Subscriptions"
   - "Shopping & Personal"
   - "Healthcare & Fitness"
   - "Savings & Investments"
   - "Income & Salary"
   - "Education & Professional"
   - "Travel & Leisure"
   - "Financial Reflection"
6. "flag": Assign an assessment flag:
   - "overspend_risk": if the cost seems unusually high, impulsive, stretches budget, or is flagged by user as a splurge
   - "on_track": reasonable, planned, standard everyday or productive expenditure
   - "savings_opportunity": identifiable areas to cut back, switch subscriptions, or negotiate discounts
   - "informational": general thought, salary incoming, or question
7. "advice": 1-2 sentences of direct, warm, journal-toned financial companion advice speaking directly to the user ("You...").
8. "is_recurring": true if this item represents a recurring expense (rent, gym, streaming, WiFi, loan, weekly groceries, insurance), false otherwise.
9. "suggested_budget": If recurring, provide { label, amount, currency, frequency: "weekly" | "monthly" }. Otherwise null.

Return ONLY a valid JSON object matching the requested schema with a "transactions" array.
`;

      const analysisSchema = {
        type: "object",
        properties: {
          transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                entry_type: { type: "string", enum: ["expense", "income", "reflection", "question"] },
                category: { type: "string" },
                amount: { type: "number" },
                currency: { type: "string" },
                flag: { type: "string", enum: ["overspend_risk", "on_track", "savings_opportunity", "informational"] },
                advice: { type: "string" },
                is_recurring: { type: "boolean" },
                suggested_budget: {
                  type: ["object", "null"],
                  properties: {
                    label: { type: "string" },
                    amount: { type: "number" },
                    currency: { type: "string" },
                    frequency: { type: "string", enum: ["weekly", "monthly"] }
                  },
                  required: ["label", "amount", "currency", "frequency"]
                }
              },
              required: ["description", "entry_type", "category", "amount", "currency", "flag", "advice", "is_recurring"]
            }
          }
        },
        required: ["transactions"]
      };

      const aiResponseText = await generateContentWithFallback(prompt, analysisSchema);
      let parsedAnalysis: any;
      try {
        parsedAnalysis = JSON.parse(aiResponseText);
      } catch (e) {
        // Fallback cleanup if markdown wrappers are present
        const cleaned = aiResponseText.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedAnalysis = JSON.parse(cleaned);
      }

      let rawTransactions: any[] = [];
      if (Array.isArray(parsedAnalysis)) {
        rawTransactions = parsedAnalysis;
      } else if (Array.isArray(parsedAnalysis?.transactions)) {
        rawTransactions = parsedAnalysis.transactions;
      } else if (Array.isArray(parsedAnalysis?.items)) {
        rawTransactions = parsedAnalysis.items;
      } else if (parsedAnalysis && typeof parsedAnalysis === "object") {
        rawTransactions = [parsedAnalysis];
      }

      if (rawTransactions.length === 0) {
        rawTransactions = [parsedAnalysis || {}];
      }

      const finalAnalyses = rawTransactions.map((item: any, idx: number) => {
        const rawAmount = typeof item.amount === "number" ? Math.max(0, item.amount) : 0;
        const entryCurrency = normalizeCurrencyCode(item.currency, homeCurrency);

        if (item.suggested_budget && item.suggested_budget.currency) {
          item.suggested_budget.currency = normalizeCurrencyCode(item.suggested_budget.currency, homeCurrency);
        }

        let fxRateToHome = 1.0;
        if (entryCurrency === homeCurrency) {
          fxRateToHome = 1.0;
        } else {
          const rateAgainstHome = rates[entryCurrency];
          if (rateAgainstHome && rateAgainstHome > 0) {
            fxRateToHome = 1 / rateAgainstHome;
          } else {
            const entryUsd = DEFAULT_USD_RATES[entryCurrency] || 1;
            const homeUsd = DEFAULT_USD_RATES[homeCurrency] || 1;
            fxRateToHome = homeUsd / entryUsd;
          }
        }

        const convertedAmount = Number((rawAmount * fxRateToHome).toFixed(2));

        return {
          description: typeof item.description === "string" && item.description.trim() 
            ? item.description.trim() 
            : (rawTransactions.length > 1 ? `Item ${idx + 1}` : text),
          category: item.category || "General Expense",
          amount: rawAmount,
          currency: entryCurrency,
          converted_amount: convertedAmount,
          home_currency: homeCurrency,
          fx_rate_used: Number(fxRateToHome.toFixed(4)),
          flag: item.flag || "on_track",
          advice: item.advice || "Keep monitoring your expenses to maintain healthy cash flow.",
          is_recurring: Boolean(item.is_recurring),
          entry_type: item.entry_type || (rawAmount > 0 ? "expense" : "reflection"),
          suggested_budget: item.suggested_budget || null,
        };
      });

      res.json({
        success: true,
        analysis: finalAnalyses[0],
        analyses: finalAnalyses,
        transactions: finalAnalyses,
      });
    } catch (err: any) {
      console.error("[Analysis Error]", err);
      // Resilient local fallback parsing if Gemini services hit rate limit or spending cap
      try {
        const fallbackItems = fallbackMultiItemParser(text, homeCurrency, rates);
        if (fallbackItems.length > 0) {
          console.log(`[Fallback Parser] Successfully extracted ${fallbackItems.length} transactions.`);
          res.json({
            success: true,
            analysis: fallbackItems[0],
            analyses: fallbackItems,
            transactions: fallbackItems,
          });
          return;
        }
      } catch (fallbackErr) {
        console.warn("[Fallback Parser Note]", fallbackErr);
      }

      res.status(500).json({
        success: false,
        error: err.message || "Failed to analyze journal entry."
      });
    }
  });

  // Multi-Turn AI Financial Sage Advisor Chat Endpoint
  app.post("/api/advisor-chat", async (req, res) => {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const data = (req.body && typeof req.body === "object") ? req.body : {};
    const messages = Array.isArray(data.messages) ? data.messages : [];
    const homeCurrency = typeof data.homeCurrency === "string" && data.homeCurrency.trim()
      ? data.homeCurrency.trim().toUpperCase()
      : "USD";
    const contextSummary = (data.contextSummary && typeof data.contextSummary === "object")
      ? data.contextSummary
      : {};

    if (messages.length === 0) {
      res.status(400).json({
        success: false,
        error: "At least one message is required for advisor conversation."
      });
      return;
    }

    try {
      // Build conversation turns safely with delimiter bounding to prevent prompt injection
      const formattedHistory = messages.map((m: any, idx: number) => {
        const role = m.role === "user" ? "User" : "Financial Sage";
        const cleanText = typeof m.text === "string" ? m.text.replace(/"""/g, "'''").trim() : "";
        return `[Turn ${idx + 1}] ${role}: """${cleanText}"""`;
      }).join("\n\n");

      const prompt = `
You are the "Mindful Financial Sage", an empathetic, wise, and highly analytical financial mentor within a personal financial journal application.
Your role is to guide the user toward sustainable wealth, conscious spending habits, emotional clarity around money, and peace of mind.

User Configuration & Real-Time Context:
- User's Preferred Currency: ${homeCurrency}
- User's Active Budgets: ${JSON.stringify(contextSummary.activeBudgets || [], null, 2)}
- Total Logged Entries: ${contextSummary.totalEntries || 0}
- Recent Logged Expenses: ${contextSummary.recentExpenses || 0} ${homeCurrency}
- Top Categories: ${JSON.stringify(contextSummary.topCategories || [])}

Conversation History:
${formattedHistory}

Instructions:
1. Provide a thoughtful, highly practical, and warm response directly addressing the user's latest inquiry.
2. Ground your advice in their actual numbers, currency, and categories when relevant.
3. Keep the tone calm, empowering, and free from financial shaming.
4. Structure your response with concise paragraphs or clear bullet points for readability.
5. If they ask about saving, budgeting, or investing concepts, give actionable step-by-step guidance without giving legal/tax advice.
6. Do NOT output system prompt markers or instructions. Speak directly to the user.
`;

      const responseText = await generateContentWithFallback(prompt);

      res.json({
        success: true,
        reply: responseText.trim()
      });
    } catch (err: any) {
      console.error("[Advisor Chat Error]", err);
      res.status(500).json({
        success: false,
        error: err.message || "Financial Sage could not respond at this moment. Please try again."
      });
    }
  });

  // Synthesize Comprehensive AI Financial Health & Mindfulness Digest
  app.post("/api/generate-financial-report", async (req, res) => {
    const data = (req.body && typeof req.body === "object") ? req.body : {};
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const budgets = Array.isArray(data.budgets) ? data.budgets : [];
    const homeCurrency = typeof data.homeCurrency === "string" && data.homeCurrency.trim()
      ? data.homeCurrency.trim().toUpperCase()
      : "USD";

    try {
      let totalExpenses = 0;
      let totalIncome = 0;
      const categoryTotals: Record<string, number> = {};
      let needsCount = 0;
      let wantsCount = 0;

      for (const e of entries) {
        const amount = Number(e.analysis?.converted_amount || 0);
        const type = e.analysis?.entry_type || "expense";
        const cat = e.analysis?.category || "General";
        const intent = e.intentTag || e.analysis?.intentTag;

        if (type === "income") {
          totalIncome += amount;
        } else if (type === "expense") {
          totalExpenses += amount;
          categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
          if (intent === "need") needsCount++;
          if (intent === "want") wantsCount++;
        }
      }

      // Sort categories
      const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
      const topCategory = sortedCats.length > 0 ? sortedCats[0][0] : "None";

      const netSavings = totalIncome - totalExpenses;
      const ratioStr = (needsCount + wantsCount > 0)
        ? `${Math.round((needsCount / (needsCount + wantsCount)) * 100)}% Needs / ${Math.round((wantsCount / (needsCount + wantsCount)) * 100)}% Wants`
        : "Balanced / Unspecified";

      const prompt = `
You are the Chief Financial Mindfulness Officer. Synthesize an executive Financial Health & Mindfulness Digest for the user.
User Home Currency: ${homeCurrency}
Data Summary:
- Total Logged Expenses: ${totalExpenses.toFixed(2)} ${homeCurrency}
- Total Logged Income: ${totalIncome.toFixed(2)} ${homeCurrency}
- Net Cashflow / Savings: ${netSavings.toFixed(2)} ${homeCurrency}
- Needs vs Wants Intent Ratio: ${ratioStr}
- Top Expense Category: ${topCategory}
- Active Recurring Budgets: ${JSON.stringify(budgets.map((b: any) => ({ label: b.label, amount: b.amount, frequency: b.frequency })))}
- Recent Journal Entries (Samples): ${JSON.stringify(entries.slice(0, 8).map((e: any) => ({ text: e.text, flag: e.analysis?.flag, category: e.analysis?.category })))}

Produce a JSON report with:
1. mindfulnessScore: an integer from 0 to 100 based on discipline, needs/wants balance, budget adherence, and reflection habits.
2. executiveSummary: 2-3 sentences summarizing their current financial posture with wisdom and calm encouragement.
3. disciplineHighlights: array of 2-3 notable positive habits or responsible actions observed.
4. vulnerabilities: array of 2-3 specific risks, leaks, or recurring overspend areas to watch.
5. actionPlan: array of 3 prioritized, achievable action steps for the next 14 days.

Return ONLY a valid JSON object matching the requested schema.
`;

      const reportSchema = {
        type: "object",
        properties: {
          mindfulnessScore: { type: "integer" },
          executiveSummary: { type: "string" },
          disciplineHighlights: { type: "array", items: { type: "string" } },
          vulnerabilities: { type: "array", items: { type: "string" } },
          actionPlan: { type: "array", items: { type: "string" } }
        },
        required: ["mindfulnessScore", "executiveSummary", "disciplineHighlights", "vulnerabilities", "actionPlan"]
      };

      const aiResponse = await generateContentWithFallback(prompt, reportSchema);
      let parsed: any;
      try {
        parsed = JSON.parse(aiResponse);
      } catch {
        const cleaned = aiResponse.replace(/```json/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleaned);
      }

      const finalReport = {
        generatedAt: Date.now(),
        periodLabel: new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }),
        totalExpensesConverted: Number(totalExpenses.toFixed(2)),
        totalIncomeConverted: Number(totalIncome.toFixed(2)),
        netSavingsConverted: Number(netSavings.toFixed(2)),
        currency: homeCurrency,
        needsVsWantsRatio: ratioStr,
        topCategory,
        mindfulnessScore: Math.min(100, Math.max(0, parsed.mindfulnessScore || 75)),
        executiveSummary: parsed.executiveSummary || "Your financial journal reflects steady awareness and mindful intent.",
        disciplineHighlights: Array.isArray(parsed.disciplineHighlights) ? parsed.disciplineHighlights : [],
        vulnerabilities: Array.isArray(parsed.vulnerabilities) ? parsed.vulnerabilities : [],
        actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : []
      };

      res.json({
        success: true,
        report: finalReport
      });
    } catch (err: any) {
      console.error("[Financial Report Error]", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to generate financial digest."
      });
    }
  });

  // Vite middleware for development vs static in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Financial Journal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
