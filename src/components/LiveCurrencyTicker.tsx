import React, { useState, useEffect } from "react";
import { ArrowRightLeft, RefreshCw, Calculator, TrendingUp, Globe, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency, getCurrencySymbol, SUPPORTED_CURRENCIES } from "../lib/currencies";

interface LiveCurrencyTickerProps {
  homeCurrency: string;
}

export const LiveCurrencyTicker: React.FC<LiveCurrencyTickerProps> = ({
  homeCurrency,
}) => {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  
  // Calculator state
  const [calcAmount, setCalcAmount] = useState<string>("100");
  const [calcFromCurrency, setCalcFromCurrency] = useState<string>(
    homeCurrency === "EUR" ? "USD" : "EUR"
  );

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fx-rates?base=${homeCurrency}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.rates) {
          setRates(data.rates);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch FX rates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [homeCurrency]);

  const targetCurrencies = ["USD", "EUR", "GBP", "JPY", "INR", "CAD", "AUD", "SGD"].filter(
    (c) => c !== homeCurrency
  );

  // Quick calculate converted value
  const numericCalcAmount = parseFloat(calcAmount) || 0;
  const fromRate = rates[calcFromCurrency] || 1;
  // If base is homeCurrency: 1 homeCurrency = fromRate calcFromCurrency
  // So 1 calcFromCurrency = 1 / fromRate homeCurrency
  const convertedToHome = fromRate > 0 ? numericCalcAmount / fromRate : numericCalcAmount;

  return (
    <div className="h-full flex flex-col bg-white border border-[#8FA899]">
      {/* Editorial Header */}
      <div className="bg-[#EDF3EF] border-b border-[#8FA899] px-3.5 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-tech text-xs uppercase tracking-wider font-bold text-[#13241A]">
            [02] CURRENCY RATES
          </span>
          <span className="w-1.5 h-1.5 bg-[#2D6A4F] inline-block"></span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCalculator((prev) => !prev)}
            className="font-tech text-[10px] uppercase tracking-wider text-[#2D6A4F] hover:text-[#13241A] font-bold underline cursor-pointer"
          >
            {showCalculator ? "[HIDE FX]" : "[QUICK FX]"}
          </button>
          <button
            type="button"
            onClick={fetchRates}
            disabled={loading}
            className="p-1 text-[#526E5D] hover:text-[#13241A] transition-colors cursor-pointer"
            title="Refresh exchange rates"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "rotate-180 transition-transform text-[#2D6A4F]" : ""}`} />
          </button>
        </div>
      </div>

      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between border-b border-[#8FA899]/30 pb-1.5">
          <span className="font-tech text-[10px] uppercase tracking-widest text-[#526E5D] font-bold">
            PARITY BASE: 1.00 {homeCurrency}
          </span>
          <span className="font-mono text-[9px] uppercase text-[#526E5D]">
            REAL-TIME
          </span>
        </div>

        {/* Dense Currency Table */}
        <div className="divide-y divide-[#8FA899]/25 border border-[#8FA899]/40 bg-[#F8F9F5]">
          {targetCurrencies.slice(0, 6).map((curr) => {
            const rate = rates[curr];
            return (
              <div
                key={curr}
                className="flex justify-between items-center px-2.5 py-1 text-xs hover:bg-[#EDF3EF] transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-tech text-[11px] font-bold text-[#13241A]">
                    {curr}
                  </span>
                  <span className="text-[10px] text-[#526E5D] font-mono">
                    ({getCurrencySymbol(curr)})
                  </span>
                </div>
                <span className="font-mono text-[11px] font-semibold text-[#13241A]">
                  {rate ? (rate < 1 ? rate.toFixed(4) : rate < 20 ? rate.toFixed(3) : rate.toFixed(2)) : "..."}
                </span>
              </div>
            );
          })}
        </div>

        {/* Expandable Quick Calculator */}
        {showCalculator && (
          <div className="p-2.5 border border-[#8FA899] bg-[#EDF3EF] space-y-2">
            <span className="block font-tech text-[9px] uppercase tracking-wider text-[#13241A] font-bold">
              [CONVERT TO {homeCurrency}]
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="w-24 px-2 py-1 border border-[#8FA899] bg-white text-[#13241A] font-mono text-xs font-semibold focus:outline-none focus:border-[#2D6A4F]"
                placeholder="100"
              />
              <select
                value={calcFromCurrency}
                onChange={(e) => setCalcFromCurrency(e.target.value)}
                className="px-2 py-1 border border-[#8FA899] bg-white text-[#13241A] font-tech text-xs font-bold cursor-pointer"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="font-tech text-[10px] text-[#13241A] pt-1.5 border-t border-[#8FA899]/40 flex justify-between items-baseline">
              <span className="text-[#526E5D] uppercase font-bold">EQUAL:</span>
              <span className="font-tech font-bold text-sm text-[#2D6A4F]">
                {formatCurrency(convertedToHome, homeCurrency)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
