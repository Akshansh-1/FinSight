import React, { useState, useEffect } from "react";
import { X, Wind, Sparkles, Heart } from "lucide-react";

interface CenteringBreathingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ZEN_THOUGHTS = [
  "True wealth is the ability to fully experience life with a clear mind.",
  "Pause before spending. Peace of mind is priceless.",
  "Money is merely energy. Direct it intentionally toward what genuinely matters.",
  "Restraint today is freedom and confidence tomorrow.",
  "Notice what you already have. Contentment is the ultimate dividend.",
];

export const CenteringBreathingModal: React.FC<CenteringBreathingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(4);
  const [thoughtIndex, setThoughtIndex] = useState(0);

  const phases = [
    { label: "Breathe In", action: "Inhale slowly and receive clarity...", color: "text-[#1C432E]" },
    { label: "Hold Gently", action: "Pause and notice the quiet space...", color: "text-[#285A3E]" },
    { label: "Exhale Fully", action: "Release impulse, tension, and hurry...", color: "text-[#3D6B51]" },
    { label: "Rest in Peace", action: "Feel centered and present with your intentions...", color: "text-[#244834]" },
  ];

  useEffect(() => {
    if (!isOpen) {
      setPhaseIndex(0);
      setSecondsRemaining(4);
      return;
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setPhaseIndex((p) => {
            const next = (p + 1) % 4;
            if (next === 0) {
              setThoughtIndex((t) => (t + 1) % ZEN_THOUGHTS.length);
            }
            return next;
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPhase = phases[phaseIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#13241A]/60">
      <div
        className="relative w-full max-w-md border border-[#8FA899] bg-white p-6 sm:p-7 text-center overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-[#526E5D] hover:text-[#13241A] cursor-pointer"
          title="Return to Journal"
          aria-label="Close breathing modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header Tag */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-tech font-bold uppercase tracking-wider bg-[#EDF3EF] text-[#13241A] border border-[#8FA899] mb-3">
          <Wind className="w-3.5 h-3.5 text-[#2D6A4F]" />
          <span>[SYS-MINDFUL] GROUNDING CADENCE</span>
        </div>

        <h3 className="font-tech text-xl font-bold uppercase tracking-wider text-[#13241A]">
          CENTER FINANCIAL AWARENESS
        </h3>
        <p className="font-mono text-[11px] text-[#526E5D] mt-1 max-w-xs mx-auto">
          Calm your impulse before committing transactions to the ledger.
        </p>

        {/* The Breathing Square Indicator */}
        <div className="my-7 flex flex-col items-center justify-center">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Outer frames with 0px radius */}
            <div className="absolute inset-0 border border-[#8FA899]" />
            <div className="absolute -inset-2 border border-[#8FA899]/40" />

            {/* Breathing Core Square */}
            <div
              className={`w-28 h-28 border border-[#8FA899] flex flex-col items-center justify-center transition-all duration-1000 ${
                phaseIndex === 0
                  ? "scale-105 bg-[#2D6A4F] text-white"
                  : phaseIndex === 1
                  ? "scale-110 bg-[#13241A] text-white"
                  : phaseIndex === 2
                  ? "scale-95 bg-[#526E5D] text-white"
                  : "scale-90 bg-[#EDF3EF] text-[#13241A]"
              }`}
            >
              <span className="font-tech text-3xl font-bold">
                {secondsRemaining}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest opacity-80">
                SECONDS
              </span>
            </div>
          </div>

          {/* Phase Title & Subtitle */}
          <div className="mt-4 min-h-[48px] flex flex-col items-center justify-center">
            <p className="font-tech text-base font-bold uppercase tracking-wider text-[#13241A]">
              {currentPhase.label}
            </p>
            <p className="font-sans text-xs text-[#526E5D] mt-0.5">
              {currentPhase.action}
            </p>
          </div>
        </div>

        {/* Grounding Thought */}
        <div className="p-3 border border-[#8FA899] bg-[#F8F9F5] font-sans text-xs italic text-[#13241A] leading-relaxed">
          &ldquo;{ZEN_THOUGHTS[thoughtIndex]}&rdquo;
        </div>

        {/* Action Button */}
        <div className="mt-6 flex items-center justify-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 font-tech text-xs uppercase tracking-wider font-bold bg-[#13241A] hover:bg-[#2D6A4F] text-white transition-colors cursor-pointer"
          >
            I AM CENTERED • ACCESS LEDGER
          </button>
        </div>
      </div>
    </div>
  );
};
