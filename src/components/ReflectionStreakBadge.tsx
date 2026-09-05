import React from "react";
import { Sparkles, Calendar, Award } from "lucide-react";
import { JournalEntry } from "../types";

interface ReflectionStreakBadgeProps {
  entries: JournalEntry[];
  onOpenBreathingModal?: () => void;
}

export const ReflectionStreakBadge: React.FC<ReflectionStreakBadgeProps> = ({
  entries,
  onOpenBreathingModal,
}) => {
  // Compute unique calendar days that have reflections
  const datesWithEntries = new Set<string>();
  entries.forEach((entry) => {
    const d = new Date(entry.timestamp || entry.createdAt);
    if (!isNaN(d.getTime())) {
      datesWithEntries.add(d.toISOString().split("T")[0]);
    }
  });

  // Calculate streak backwards from today or yesterday
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const hasLoggedToday = datesWithEntries.has(todayStr);

  let streak = 0;
  let checkDate = new Date(today);
  
  // If haven't logged today yet, streak can still be valid from yesterday
  if (!hasLoggedToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dStr = checkDate.toISOString().split("T")[0];
    if (datesWithEntries.has(dStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Get last 7 days representation
  const past7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    const dStr = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString(undefined, { weekday: "narrow" });
    const isToday = dStr === todayStr;
    const isLogged = datesWithEntries.has(dStr);
    return { dateStr: dStr, dayLabel, isToday, isLogged };
  });

  return (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
      {/* Streak Badge */}
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#16241C] bg-white text-[#16241C]"
        title={hasLoggedToday ? "You recorded a mindful reflection today!" : "Record an entry today to extend your streak!"}
      >
        <div className="w-5 h-5 bg-[#16241C]/5 text-[#2E7D52] flex items-center justify-center font-bold text-xs">
          {streak > 0 ? "🌿" : "🌱"}
        </div>
        <div className="text-left leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-semibold text-[#16241C]">
              {streak} {streak === 1 ? "Day" : "Days"}
            </span>
            {hasLoggedToday ? (
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#22633E] px-1 py-0.5 bg-[#E5F3EB] border border-[#2E7D52]/40">
                Active
              </span>
            ) : (
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#16241C]/60 px-1 py-0.5 bg-[#F8F7F4] border border-[#16241C]/20">
                Pending
              </span>
            )}
          </div>
        </div>

        {/* 7-day mini seed dots */}
        <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-[#16241C]/20">
          {past7Days.map((day, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center"
              title={`${day.dateStr}: ${day.isLogged ? "Mindful reflection recorded" : "No entry"}`}
            >
              <span
                className={`w-2 h-2 transition-all ${
                  day.isLogged
                    ? "bg-[#2E7D52]"
                    : day.isToday
                    ? "border border-[#2E7D52] bg-white"
                    : "bg-[#16241C]/20"
                }`}
              />
              <span className="font-mono text-[8px] text-[#16241C]/60 mt-0.5 leading-none uppercase">
                {day.dayLabel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Take a Breath Button */}
      {onOpenBreathingModal && (
        <button
          type="button"
          onClick={onOpenBreathingModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#16241C] bg-white hover:bg-[#16241C]/5 text-[#16241C] font-mono text-xs uppercase tracking-wider font-semibold transition-colors cursor-pointer"
          title="Take 30 seconds to center yourself before journaling"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#2E7D52]" />
          <span>Breathe</span>
        </button>
      )}
    </div>
  );
};
